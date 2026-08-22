const DEFAULT_ESSENTIALS=[
  ['GitHub','https://github.com/'],
  ['AWS','https://console.aws.amazon.com/'],
  ['YouTube','https://www.youtube.com/']
];
const form=document.getElementById('search'),q=document.getElementById('q');
form.addEventListener('submit',e=>{e.preventDefault();const raw=q.value.trim();if(!raw)return;let target;if(/^https?:\/\//i.test(raw))target=raw;else if(/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw))target='https://'+raw;else target='https://www.google.com/search?q='+encodeURIComponent(raw);location.href=target;});
async function init(){const{activeWorkspace='Development',richmackMode=false,essentials=DEFAULT_ESSENTIALS}=await chrome.storage.local.get(['activeWorkspace','richmackMode','essentials']);document.getElementById('workspace').textContent=activeWorkspace;document.getElementById('mode').textContent=richmackMode?'ON':'OFF';const root=document.getElementById('essentials');for(const [name,url] of essentials){const a=document.createElement('a');a.href=url;a.textContent=name;root.appendChild(a);}}
init();
