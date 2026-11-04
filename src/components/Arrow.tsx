export function Arrow({direction='up-right',size=24}:{direction?:'up-right'|'down-right'|'down-left'|'right'|'down'|'left';size?:number}){
  const rotate={'up-right':0,'down-right':90,'down-left':180,right:45,down:135,left:225}[direction];
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" style={{transform:`rotate(${rotate}deg)`}}><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
