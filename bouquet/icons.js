// Picker artwork only. Assembly and its loose parts are rendered as real 3D meshes.
let iconCounter = 0;

export function flowerIcon(kind) {
  const id = `flower-picker-${++iconCounter}`;
  const tulip = kind === 'tulip' || kind === 'purple-tulip';
  const definitions = `<defs>
    <linearGradient id="${id}-stem" x1="0" x2="1"><stop stop-color="#3c6045"/><stop offset=".43" stop-color="#91ad72"/><stop offset="1" stop-color="#51784e"/></linearGradient>
    <linearGradient id="${id}-leaf" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a7bd87"/><stop offset=".5" stop-color="#72945d"/><stop offset="1" stop-color="#365b40"/></linearGradient>
    <linearGradient id="${id}-purple-back" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#bca0d8"/><stop offset=".45" stop-color="#9977bc"/><stop offset="1" stop-color="#654780"/></linearGradient>
    <linearGradient id="${id}-purple-front" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#d0b7e5"/><stop offset=".37" stop-color="#b18dce"/><stop offset="1" stop-color="#7e589e"/></linearGradient>
    <linearGradient id="${id}-orange" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#ffcd7f"/><stop offset=".4" stop-color="#ffad4b"/><stop offset="1" stop-color="#d87221"/></linearGradient>
    <radialGradient id="${id}-center" cx=".35" cy=".3"><stop stop-color="#f6ba5c"/><stop offset="1" stop-color="#b67429"/></radialGradient>
  </defs>`;
  const stalk = `<path d="M-5 ${tulip ? 74 : 10} L-5 144 Q0 150 6 144 L6 ${tulip ? 74 : 10}Z" fill="url(#${id}-stem)"/><path d="M0 134 Q-31 123-37 94 Q-8 103 0 134Z" fill="url(#${id}-leaf)"/><path d="M1 123 Q27 112 36 87 Q10 97 1 123Z" fill="url(#${id}-leaf)"/>`;
  let bloom;
  if (tulip) {
    bloom = `<path d="M-55-62 Q-35-90 0-109 Q35-86 55-59 C76-12 48 65 0 96 C-52 77-75-11-55-62Z" fill="url(#${id}-purple-back)"/>
      <path d="M-80-75 C-61-84-28-52-7-10 Q23 49 0 98 C-48 95-81 63-88 14 Q-97-45-80-75Z" fill="url(#${id}-purple-back)" stroke="#74538e" stroke-opacity=".3" stroke-width="1.5"/>
      <path d="M80-77 C61-84 28-52 8-12 Q-22 48 0 98 C48 94 79 62 87 14 Q97-43 80-77Z" fill="url(#${id}-purple-back)" stroke="#74538e" stroke-opacity=".3" stroke-width="1.5"/>
      <path d="M-47-48 Q-27-70 0-88 Q28-70 49-43 C69 2 45 76 0 99 C-48 77-67-6-47-48Z" fill="url(#${id}-purple-front)" stroke="#8f6bab" stroke-opacity=".35" stroke-width="1.4"/>
      <path d="M-40-42 Q-52 17-18 63 M-79-66 Q-87-7-62 42" fill="none" stroke="#efdcf8" stroke-opacity=".58" stroke-width="3" stroke-linecap="round"/>
      <path d="M0-80 Q-13 7 1 91" fill="none" stroke="#ead4f5" stroke-opacity=".25" stroke-width="1.5"/>`;
  } else {
    let petals = '';
    for (let ring = 0; ring < 2; ring += 1) {
      const count = ring ? 14 : 18;
      for (let i = 0; i < count; i += 1) {
        const d = ring
          ? 'M-5-13 C-13-34-15-62-4-74 Q4-80 10-63 C15-45 9-26 5-13Z'
          : 'M-6-18 C-14-44-16-82-7-97 Q0-109 9-91 C17-69 12-39 6-18Z';
        petals += `<g transform="rotate(${i * 360 / count + ring * 11})"><path d="${d}" fill="url(#${id}-orange)" stroke="#c77526" stroke-opacity=".28" stroke-width="1.1"/><path d="M-3 ${ring ? '-62' : '-87'} Q-5-42 0-23" fill="none" stroke="#ffe2ad" stroke-opacity=".55" stroke-width="1.3" stroke-linecap="round"/></g>`;
      }
    }
    let seeds = '';
    for (let i = 0; i < 12; i += 1) {
      const angle = i * Math.PI / 6;
      seeds += `<circle cx="${(Math.cos(angle) * 13).toFixed(2)}" cy="${(Math.sin(angle) * 11).toFixed(2)}" r="1.8" fill="${i % 2 ? '#bf7a2c' : '#f8c76d'}"/>`;
    }
    bloom = `<g transform="scale(1 .88)">${petals}</g><ellipse rx="22" ry="19" fill="url(#${id}-center)"/>${seeds}<circle cx="-3" cy="-2" r="2.4" fill="#f6cb77"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140" width="100%" height="100%" aria-hidden="true" style="display:block;overflow:hidden">${definitions}<g transform="translate(60 55) scale(.48)">${stalk}${bloom}</g></svg>`;
}
