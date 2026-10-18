import type {Attempt} from './faroTypes.js';
type Answers=Attempt['answers'];
type Request=<T>(path:string,method?:string,body?:unknown,signal?:AbortSignal)=>Promise<T>;
const same=(a:Answers,b:Answers)=>JSON.stringify(Object.entries(a).sort())===JSON.stringify(Object.entries(b).sort());

/** One in-memory draft and one request at a time. No browser persistence of private answers. */
export class AssessmentAutosave {
  private desired:Answers;
  private base:Answers;
  private attempt:Attempt;
  private request:Promise<Attempt>|null=null;
  private delay:ReturnType<typeof setTimeout>|undefined;
  private abort=new AbortController();
  private disposed=false;
  private finishing=false;
  private ended=false;
  private refreshRequired=false;
  private uncertain:Answers|null=null;
  private conflict:Attempt|null=null;
  private deadline:number;
  private status=document.createElement('p');
  private actions=document.createElement('div');
  private remote=document.createElement('pre');
  private keep=document.createElement('button');
  private retry=document.createElement('button');
  private discard=document.createElement('button');

  constructor(private form:HTMLFormElement,attempt:Attempt,private api:Request,private accept:(attempt:Attempt,recovered?:boolean)=>void) {
    this.attempt=attempt;this.desired={...attempt.answers};this.base={...attempt.answers};
    this.deadline=performance.now()+Date.parse(attempt.expiresAt!)-Date.parse(attempt.serverNow);
    this.status.id='f-answer-save-status';this.status.setAttribute('role','status');this.status.setAttribute('aria-live','polite');
    this.actions.className='f-actions';
    for(const [button,title,action] of [
      [this.keep,'Zachowaj moją odpowiedź',()=>{if(!this.conflict)return;this.update(this.conflict);this.conflict=null;this.refreshRequired=false;void this.flush().catch(()=>{});}],
      [this.retry,'Ponów zapis',()=>{void this.flush().catch(()=>{});}],
      [this.discard,'Wczytaj zapisaną odpowiedź',()=>{void this.loadSaved().catch(()=>{});}]
    ] as const){button.type='button';button.textContent=title;button.addEventListener('click',action);this.actions.append(button);}
    this.remote.hidden=true;this.form.append(this.status,this.actions,this.remote);
    this.form.addEventListener('input',this.changed);this.form.addEventListener('change',this.changed);
    window.addEventListener('online',this.reconnect);window.addEventListener('offline',this.offline);
    this.show('saved',`Odpowiedzi zapisane. Wersja ${attempt.revision}.`);
  }
  get id(){return this.attempt.id;}
  get pending(){return Boolean(this.request)||!same(this.desired,this.base);}
  private read():Answers {
    const data=new FormData(this.form),answers:Answers={};
    for(const task of this.attempt.tasks){const raw=data.get(task.id);if(raw===null)continue;
      if(this.attempt.type==='OPEN_ANSWER'){const answer=String(raw);if(answer.trim())answers[task.id]=answer;}
      else answers[task.id]=Number(raw);
    }
    return answers;
  }
  private paint(answers:Answers){
    for(const task of this.attempt.tasks)for(const field of this.form.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('[name]')){
      if(field.name!==task.id)continue;
      if(field instanceof HTMLInputElement&&field.type==='radio')field.checked=Number(field.value)===answers[task.id];
      else field.value=String(answers[task.id]??'');
    }
  }
  private show(state:string,message:string){
    if(this.disposed)return;
    this.status.dataset.saveState=state;this.status.dataset.savedRevision=String(this.attempt.revision);this.status.textContent=message;
    this.status.classList.toggle('f-error',['error','conflict','offline','expired'].includes(state));
    this.actions.hidden=!['error','conflict','offline','expired'].includes(state);
    this.keep.hidden=state!=='conflict';this.retry.hidden=!['error','offline'].includes(state);
    this.remote.hidden=state!=='conflict';
  }
  private changed=(event:Event)=>{
    const field=event.target as HTMLInputElement|HTMLTextAreaElement;
    if(!this.attempt.tasks.some(t=>t.id===field.name)||this.finishing||this.ended||this.disposed)return;
    this.desired=this.read();clearTimeout(this.delay);
    if(this.conflict)return;
    if(!navigator.onLine){this.offline();return;}
    this.show('pending','Odpowiedź czeka na zapis…');
    this.delay=setTimeout(()=>{void this.flush().catch(()=>{});},400);
  };
  private offline=()=>{if(this.pending)this.show('offline','Offline — odpowiedź czeka na zapis w tej karcie. Pozostaw ją otwartą.');};
  private reconnect=()=>{if(this.pending&&!this.ended&&!this.finishing&&!this.conflict){this.refreshRequired=true;void this.flush().catch(()=>{});}};
  private update(attempt:Attempt,recovered=false){this.attempt=attempt;this.base={...attempt.answers};this.accept(attempt,recovered);}
  private recoverClosed(latest:Attempt){
    if(latest.state==='STARTED'||latest.state==='EXPIRED')return false;
    this.desired={...latest.answers};this.refreshRequired=false;this.uncertain=null;this.conflict=null;this.ended=true;clearTimeout(this.delay);
    const fields=this.form.querySelector('fieldset');if(fields)fields.disabled=true;
    this.update(latest,true);return true;
  }
  private ensureActive(){
    if(this.disposed)throw new Error('Widok próby został zamknięty.');
    if(this.ended||this.attempt.state!=='STARTED'||performance.now()>=this.deadline){this.expire();throw new Error('Czas próby upłynął. Niezapisane zmiany nie zostały przesłane.');}
    if(!navigator.onLine){this.offline();throw new Error('Zapis wymaga połączenia z serwerem.');}
    if(this.conflict)throw new Error('Wybierz odpowiedź po konflikcie z inną kartą.');
  }
  private async reconcile(){
    const latest=await this.api<Attempt>(`/attempts/${this.id}`,'GET',undefined,this.abort.signal);
    if(this.recoverClosed(latest))return;
    if(latest.state!=='STARTED'||Date.parse(latest.expiresAt!)<=Date.parse(latest.serverNow)){this.update(latest);this.expire();throw new Error('Próba nie jest już aktywna.');}
    if(!same(latest.answers,this.base)&&(!this.uncertain||!same(latest.answers,this.uncertain))){
      this.conflict=latest;this.remote.textContent='Odpowiedź zapisana na serwerze:\n'+latest.tasks.map(t=>`${t.prompt}\n${latest.answers[t.id]??'Brak odpowiedzi'}`).join('\n\n');
      this.show('conflict','Odpowiedź zmieniła się w innej karcie. Wybierz odpowiedź, którą chcesz zachować.');throw new Error('Konflikt odpowiedzi.');
    }
    this.update(latest);this.refreshRequired=false;this.uncertain=null;
  }
  async flush(submit=false):Promise<Attempt>{
    clearTimeout(this.delay);
    // Every caller joins the same queue, including submit and navigation.
    while(this.request)await this.request;
    if(!submit&&!this.pending&&!this.refreshRequired)return this.attempt;
    const work=async()=>{
      try {
        if(this.refreshRequired)await this.reconcile();
        if(this.attempt.state!=='STARTED')return this.attempt;
        this.ensureActive();
        while(!same(this.desired,this.base)){
          this.ensureActive();const answers={...this.desired};this.uncertain=answers;this.show('saving','Zapisuję odpowiedź…');
          const saved=await this.api<Attempt>(`/attempts/${this.id}/answers`,'PUT',{answers,expectedVersion:this.attempt.revision},this.abort.signal);
          this.update(saved);this.uncertain=null;
          // A response confirms only its own snapshot; it never repaints newer typed text.
        }
        if(submit){this.ensureActive();const result=await this.api<Attempt>(`/attempts/${this.id}/submit`,'POST',{answers:{...this.desired},expectedVersion:this.attempt.revision},this.abort.signal);this.update(result);this.ended=true;}
        this.show(this.ended&&!submit?'expired':'saved',this.ended&&!submit?`Czas próby upłynął. Potwierdzono ostatni zapis: wersja ${this.attempt.revision}.`:`Zapisano automatycznie. Wersja ${this.attempt.revision}.`);return this.attempt;
      }catch(error){
        const failure=error as Error&{status?:number;code?:string};
        if(this.disposed)throw error;
        if(failure.code==='ATTEMPT_EXPIRED'){this.expire();}
        else if(!this.ended&&!this.conflict){
          this.refreshRequired=true;
          if(failure.status===409){try{await this.reconcile();}catch{/* The draft stays in this form until resolved. */}}
          if(!this.conflict&&!this.ended)this.show(navigator.onLine?'error':'offline',`${failure.message} Odpowiedź pozostaje w tej karcie. Ponów zapis.`);
        }
        throw error;
      }
    };
    const job=work();this.request=job;
    try{return await job;}finally{if(this.request===job)this.request=null;}
  }
  async commit(submit:boolean){
    if(this.finishing)throw new Error('Trwa zapis próby.');
    this.desired=this.read();this.finishing=true;
    const fields=this.form.querySelector('fieldset');if(fields)fields.disabled=true;
    try{return await this.flush(submit);}finally{this.finishing=false;if(fields&&!this.ended)fields.disabled=false;}
  }
  private async loadSaved(){
    clearTimeout(this.delay);while(this.request){try{await this.request;}catch{/* Read current state after an uncertain write. */}}
    try{const latest=this.conflict??await this.api<Attempt>(`/attempts/${this.id}`,'GET',undefined,this.abort.signal);if(this.recoverClosed(latest))return;this.update(latest);this.desired={...latest.answers};this.paint(this.desired);this.conflict=null;this.refreshRequired=false;this.uncertain=null;
      if(latest.state==='EXPIRED'||Date.parse(latest.expiresAt!)<=Date.parse(latest.serverNow))this.expire();
      this.show(this.ended?'expired':'saved',this.ended?'Czas próby upłynął. Wczytano ostatnią zapisaną odpowiedź.':`Wczytano zapisaną odpowiedź. Wersja ${latest.revision}.`);
    }catch(error){this.show('error','Nie można wczytać zapisu. Odpowiedź pozostaje w tej karcie.');throw error;}
  }
  expire(){
    if(this.ended)return;this.ended=true;clearTimeout(this.delay);
    const fields=this.form.querySelector('fieldset');if(fields)fields.disabled=true;
    this.show('expired','Czas próby upłynął. Zapisane odpowiedzi pozostają na serwerze; niezapisane zmiany nie zostały potwierdzone.');
  }
  dispose(){this.disposed=true;clearTimeout(this.delay);this.abort.abort();this.desired={};this.base={};this.uncertain=null;this.conflict=null;
    this.form.removeEventListener('input',this.changed);this.form.removeEventListener('change',this.changed);window.removeEventListener('online',this.reconnect);window.removeEventListener('offline',this.offline);
  }
}
