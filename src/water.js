// A small, independent water pass. The generated environment remains the source
// artwork; this pass adds restrained refraction and sun glints over its water.
// If WebGL is unavailable, the existing CSS ocean image remains visible.
import './water.css';

const VERTEX=`
attribute vec2 position;
varying vec2 uv;
void main(){ uv=position*.5+.5; gl_Position=vec4(position,0.,1.); }
`;
const FRAGMENT=`
precision highp float;
varying vec2 uv;
uniform sampler2D ocean;
uniform vec2 resolution;
uniform vec2 imageSize;
uniform float time;
uniform float danger;
void main(){
  float ratio=(resolution.x/resolution.y)/(imageSize.x/imageSize.y);
  vec2 cover=vec2(min(ratio,1.),min(1./ratio,1.));
  vec2 p=(uv-.5)*cover+.5;
  // Leave the drowned ruins and the upper-left shoreline undistorted.
  float water=smoothstep(.12,.32,1.-p.y)*smoothstep(.03,.16,p.x);
  float a=dot(p,vec2(49.,31.))-time*.48;
  float b=dot(p,vec2(-33.,73.))+time*.32;
  vec2 flow=vec2(sin(a)+.42*sin(b),cos(a*.71)+.38*cos(b));
  vec2 refracted=clamp(p+flow*.0015*water,vec2(.001),vec2(.999));
  vec3 color=texture2D(ocean,refracted).rgb;
  float glint=pow(max(0.,sin(a*2.1)*cos(b*1.7)),15.);
  float sunPath=exp(-pow((p.x+.38*p.y-.47)*2.2,2.));
  color+=vec3(.14,.105,.062)*glint*sunPath*water;
  float detail=sin(a)*.003+cos(b)*.002;
  color+=vec3(.45,.7,.65)*detail*water;
  // Combat brings a cooler, slightly darker atmosphere without hiding tiles.
  color=mix(color,color*vec3(.86,.94,1.01),danger*.4);
  gl_FragColor=vec4(color,1.);
}
`;

function compile(gl,type,source){
  const shader=gl.createShader(type);
  gl.shaderSource(shader,source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);return null;}
  return shader;
}

export function createOceanBackdrop(host,source,getState){
  const canvas=document.createElement('canvas');canvas.className='ocean-water';
  canvas.setAttribute('aria-hidden','true');
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
  if(!gl)return ()=>{};
  const vertex=compile(gl,gl.VERTEX_SHADER,VERTEX),fragment=compile(gl,gl.FRAGMENT_SHADER,FRAGMENT);
  if(!vertex||!fragment){gl.getExtension('WEBGL_lose_context')?.loseContext();return ()=>{};}
  const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);return ()=>{};}
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const uniforms=Object.fromEntries(['ocean','resolution','imageSize','time','danger'].map(k=>[k,gl.getUniformLocation(program,k)]));
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  const image=new Image(),motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let stopped=false,loaded=false,lost=false,raf=0,last=-Infinity,start=performance.now(),frame=0;
  function resize(){
    // Cap fill rate on retina screens; the art already carries fine detail.
    const dpr=Math.min(window.devicePixelRatio||1,1.25),rect=host.getBoundingClientRect();
    canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));
    gl.viewport(0,0,canvas.width,canvas.height);render(performance.now());
  }
  function render(now){
    if(!loaded||lost||stopped)return;
    gl.useProgram(program);gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);
    gl.uniform2f(uniforms.imageSize,image.naturalWidth,image.naturalHeight);
    gl.uniform1f(uniforms.time,motion.matches?0:(now-start)/1000);
    const s=getState(),combat=s.phase==='combat';
    gl.uniform1f(uniforms.danger,combat?(s.enemy?.type==='boss'?1:.45):0);
    gl.uniform1i(uniforms.ocean,0);gl.drawArrays(gl.TRIANGLES,0,6);
    frame++;if(frame===1||frame%30===0)canvas.dataset.frame=String(frame);
  }
  function loop(now){
    if(stopped||lost)return;
    if(!document.hidden&&!motion.matches&&now-last>=1000/30){last=now;render(now);}
    if(!motion.matches)raf=requestAnimationFrame(loop);
  }
  function motionChange(){cancelAnimationFrame(raf);last=-Infinity;render(performance.now());if(!motion.matches)raf=requestAnimationFrame(loop);}
  const observer=new ResizeObserver(resize);
  function release(){
    if(stopped)return;stopped=true;cancelAnimationFrame(raf);observer.disconnect();motion.removeEventListener('change',motionChange);
    canvas.remove();gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
  }
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;cancelAnimationFrame(raf);canvas.classList.remove('ready');});
  image.onload=()=>{
    if(stopped)return;gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);loaded=true;
    host.prepend(canvas);observer.observe(host);motion.addEventListener('change',motionChange);resize();canvas.classList.add('ready');
    if(!motion.matches)raf=requestAnimationFrame(loop);
  };
  image.onerror=release;image.src=source;
  return release;
}
