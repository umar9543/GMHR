import{bo as _,n as k,aT as c,_ as o,bp as R,r as N,o as w,q as z,j as v,t as E,v as q,bq as F}from"./index-45FjJPIw.js";const I=["className","color","disableShrink","size","style","thickness","value","variant"];let l=r=>r,P,b,$,S;const t=44,K=_(P||(P=l`
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
`)),T=_(b||(b=l`
  0% {
    stroke-dasharray: 1px, 200px;
    stroke-dashoffset: 0;
  }

  50% {
    stroke-dasharray: 100px, 200px;
    stroke-dashoffset: -15px;
  }

  100% {
    stroke-dasharray: 100px, 200px;
    stroke-dashoffset: -125px;
  }
`)),U=r=>{const{classes:s,variant:e,color:a,disableShrink:d}=r,u={root:["root",e,`color${c(a)}`],svg:["svg"],circle:["circle",`circle${c(e)}`,d&&"circleDisableShrink"]};return q(u,F,s)},W=k("span",{name:"MuiCircularProgress",slot:"Root",overridesResolver:(r,s)=>{const{ownerState:e}=r;return[s.root,s[e.variant],s[`color${c(e.color)}`]]}})(({ownerState:r,theme:s})=>o({display:"inline-block"},r.variant==="determinate"&&{transition:s.transitions.create("transform")},r.color!=="inherit"&&{color:(s.vars||s).palette[r.color].main}),({ownerState:r})=>r.variant==="indeterminate"&&R($||($=l`
      animation: ${0} 1.4s linear infinite;
    `),K)),B=k("svg",{name:"MuiCircularProgress",slot:"Svg",overridesResolver:(r,s)=>s.svg})({display:"block"}),G=k("circle",{name:"MuiCircularProgress",slot:"Circle",overridesResolver:(r,s)=>{const{ownerState:e}=r;return[s.circle,s[`circle${c(e.variant)}`],e.disableShrink&&s.circleDisableShrink]}})(({ownerState:r,theme:s})=>o({stroke:"currentColor"},r.variant==="determinate"&&{transition:s.transitions.create("stroke-dashoffset")},r.variant==="indeterminate"&&{strokeDasharray:"80px, 200px",strokeDashoffset:0}),({ownerState:r})=>r.variant==="indeterminate"&&!r.disableShrink&&R(S||(S=l`
      animation: ${0} 1.4s ease-in-out infinite;
    `),T)),L=N.forwardRef(function(s,e){const a=w({props:s,name:"MuiCircularProgress"}),{className:d,color:u="primary",disableShrink:D=!1,size:p=40,style:j,thickness:i=3.6,value:h=0,variant:x="indeterminate"}=a,M=z(a,I),n=o({},a,{color:u,disableShrink:D,size:p,thickness:i,value:h,variant:x}),m=U(n),f={},g={},C={};if(x==="determinate"){const y=2*Math.PI*((t-i)/2);f.strokeDasharray=y.toFixed(3),C["aria-valuenow"]=Math.round(h),f.strokeDashoffset=`${((100-h)/100*y).toFixed(3)}px`,g.transform="rotate(-90deg)"}return v.jsx(W,o({className:E(m.root,d),style:o({width:p,height:p},g,j),ownerState:n,ref:e,role:"progressbar"},C,M,{children:v.jsx(B,{className:m.svg,ownerState:n,viewBox:`${t/2} ${t/2} ${t} ${t}`,children:v.jsx(G,{className:m.circle,style:f,ownerState:n,cx:t,cy:t,r:(t-i)/2,fill:"none",strokeWidth:i})})}))}),Z=L;export{Z as C};
