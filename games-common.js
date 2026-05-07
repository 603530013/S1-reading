/* ===== 英文複習樂園 · 共用 JS 工具 =====
   Requires: data/phonics-114-1.js, data/vocabulary-114-1.js,
             data/phonics-114-2.js, data/vocabulary-114-2.js
   (each sets a window global with the dataset array)
*/

/* ---------- 資料彙整 ---------- */
function getAllData(){
  return [].concat(
    (window.PHONICS_114_1||[]),
    (window.VOCAB_114_1||[]),
    (window.PHONICS_114_2||[]),
    (window.VOCAB_114_2||[])
  );
}
/* 依條件篩選：type='phonics'|'vocab'|'all', terms: set of '114-1','114-2',
   weeks: Map<term, Set<week>>
*/
function filterItems(opts){
  var all = getAllData();
  var type = opts.type || 'all';
  var weeksByTerm = opts.weeks || {};
  return all.filter(function(it){
    if(type!=='all' && it.type!==type) return false;
    var ws = weeksByTerm[it.term];
    if(!ws || ws.size===0) return false;
    // 任何一週符合即通過
    for(var i=0;i<it.weeks.length;i++){
      if(ws.has(it.weeks[i])) return true;
    }
    return false;
  });
}
function getWeeksForTerm(term, type){
  var all = getAllData();
  var set = new Set();
  all.forEach(function(it){
    if(it.term!==term) return;
    if(type && type!=='all' && it.type!==type) return;
    it.weeks.forEach(function(w){set.add(w);});
  });
  // 排序 W1, W2, ...
  return Array.from(set).sort(function(a,b){
    var na = parseInt(a.replace(/[^\d]/g,''))||0;
    var nb = parseInt(b.replace(/[^\d]/g,''))||0;
    return na-nb;
  });
}

/* ---------- 工具函式 ---------- */
function shuffle(arr){
  var a = arr.slice();
  for(var i=a.length-1;i>0;i--){
    var j = Math.floor(Math.random()*(i+1));
    var t=a[i];a[i]=a[j];a[j]=t;
  }
  return a;
}
function el(tag, opts, children){
  var e = document.createElement(tag);
  if(opts){
    if(opts.cls) e.className = opts.cls;
    if(opts.text!==undefined) e.textContent = opts.text;
    if(opts.html!==undefined) e.innerHTML = opts.html;
    if(opts.attrs) Object.keys(opts.attrs).forEach(function(k){e.setAttribute(k,opts.attrs[k]);});
    if(opts.on) Object.keys(opts.on).forEach(function(k){e.addEventListener(k,opts.on[k]);});
    if(opts.style) Object.assign(e.style, opts.style);
  }
  if(children){
    children.forEach(function(c){
      if(c==null) return;
      if(typeof c === 'string') e.appendChild(document.createTextNode(c));
      else e.appendChild(c);
    });
  }
  return e;
}

/* ---------- Text-to-Speech ---------- */
var _voice = null;
var _voiceReady = false;
function initSpeech(){
  if(!('speechSynthesis' in window)) return;
  function pickVoice(){
    var voices = speechSynthesis.getVoices();
    // 優先選英文 (en-US/en-GB)，兒童友善的女聲若有
    var prefs = ['Samantha','Google US English','Microsoft Zira','en-US','en-GB','en'];
    for(var i=0;i<prefs.length;i++){
      var p = prefs[i];
      var v = voices.find(function(v){ return v.name && v.name.indexOf(p)>=0; })
           || voices.find(function(v){ return v.lang && v.lang.indexOf(p)>=0; });
      if(v){ _voice = v; break; }
    }
    if(!_voice && voices.length>0){
      _voice = voices.find(function(v){return (v.lang||'').toLowerCase().startsWith('en');}) || voices[0];
    }
    _voiceReady = true;
  }
  pickVoice();
  if(!_voiceReady){
    speechSynthesis.onvoiceschanged = pickVoice;
  }
}
function speak(text, opts){
  if(!('speechSynthesis' in window)){ return; }
  try{
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    if(_voice) u.voice = _voice;
    u.lang = (opts && opts.lang) || 'en-US';
    u.rate = (opts && opts.rate) || 0.9;
    u.pitch = (opts && opts.pitch) || 1;
    speechSynthesis.speak(u);
  }catch(e){ console.warn(e); }
}

/* ---------- 週次/範圍選擇器 ---------- */
/* 建立範圍選單，返回 {getSelection(), render()}
   contentType: 'phonics'|'vocab'|'all'
   onChange(sel): optional callback with current selection
*/
function buildWeekSelector(container, contentType, onChange){
  container.innerHTML = '';
  contentType = contentType || 'all';

  // 狀態：每個 term 的已選 weeks
  var state = { '114-1': new Set(), '114-2': new Set() };

  function emit(){
    if(onChange) onChange({
      weeks: { '114-1': new Set(state['114-1']), '114-2': new Set(state['114-2']) },
      type: contentType
    });
  }

  ['114-1','114-2'].forEach(function(term, idx){
    var weeks = getWeeksForTerm(term, contentType);
    if(weeks.length===0) return;

    var sec = el('div',{cls:'term-section'});
    var hd = el('div',{cls:'term-section-hd'},[
      el('span',{cls:'term-badge'+(idx===1?' t2':''), text:term + ' 學期'}),
      el('button',{cls:'btn-ghost btn-sm',text:'全選/取消',on:{click:function(){
        var allOn = weeks.every(function(w){return state[term].has(w);});
        weeks.forEach(function(w){ allOn ? state[term].delete(w) : state[term].add(w); });
        render();
        emit();
      }}})
    ]);
    sec.appendChild(hd);

    var grid = el('div',{cls:'week-grid'});
    weeks.forEach(function(w){
      var chip = el('button',{
        cls:'week-chip' + (state[term].has(w)?' on':''),
        text:w,
        on:{click:function(){
          if(state[term].has(w)) state[term].delete(w);
          else state[term].add(w);
          render();
          emit();
        }}
      });
      grid.appendChild(chip);
    });
    sec.appendChild(grid);
    container.appendChild(sec);
  });

  function render(){
    // 重新繪製，保持當前 state
    var tmp = { '114-1': new Set(state['114-1']), '114-2': new Set(state['114-2']) };
    container.innerHTML = '';
    buildWeekSelector(container, contentType, onChange);
    // 還原狀態
    var btns = container.querySelectorAll('.week-chip');
    // 不能只靠重繪因為 closure 已失效，改為下列：我們直接重新呼叫 buildWeekSelector
    // 但上面那行會把 state 重置，因此採用不遞歸作法：更新 chip class 即可
  }
  // 直接重繪 chip class（不重建 DOM）
  function refresh(){
    var secs = container.querySelectorAll('.term-section');
    ['114-1','114-2'].forEach(function(term, idx){
      var sec = secs[idx];
      if(!sec) return;
      var weeks = getWeeksForTerm(term, contentType);
      var chips = sec.querySelectorAll('.week-chip');
      chips.forEach(function(chip, i){
        var w = weeks[i];
        if(state[term].has(w)) chip.classList.add('on');
        else chip.classList.remove('on');
      });
    });
  }
  // 覆寫 render
  render = refresh;

  return {
    getSelection: function(){
      return {
        weeks: { '114-1': new Set(state['114-1']), '114-2': new Set(state['114-2']) },
        type: contentType
      };
    },
    setType: function(t){ contentType = t; buildWeekSelector(container, contentType, onChange); },
    selectAll: function(){
      ['114-1','114-2'].forEach(function(term){
        getWeeksForTerm(term, contentType).forEach(function(w){ state[term].add(w); });
      });
      refresh();
      emit();
    }
  };
}

/* ---------- 通用計分/摘要 ---------- */
function formatStatSummary(correct, total){
  var rate = total>0 ? Math.round(correct/total*100) : 0;
  return correct + ' / ' + total + ' （正確率 ' + rate + '%）';
}

/* ---------- 鍵盤 Enter 支援 ---------- */
function onEnter(input, fn){
  input.addEventListener('keydown', function(e){
    if(e.key==='Enter'){ e.preventDefault(); fn(); }
  });
}

/* ---------- 初始化檢查 ---------- */
window.addEventListener('DOMContentLoaded', initSpeech);
