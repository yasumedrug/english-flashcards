import type { ReactNode } from 'react'

type IconName = 'today' | 'study' | 'browse' | 'settings' | 'edit' | 'back' | 'forward' | 'shuffle' | 'volume' | 'check' | 'close'

const shapes: Record<IconName, ReactNode> = {
  today: <><rect x="4" y="3.5" width="16" height="17" rx="2" /><path d="M8 2v4m8-4v4M4 9h16M8 13h3m-3 4h7" /></>,
  study: <><rect x="6" y="6" width="15" height="15" rx="2" /><path d="M17 3H5a2 2 0 0 0-2 2v12M10 11h7m-7 4h5" /></>,
  browse: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  settings: <><path d="m10 3-.5 2.2-2 .9-2-.8-2 3.4 1.6 1.5v2.3L3.5 14l2 3.4 2-.8 2 .9.5 2.2h4l.5-2.2 2-.9 2 .8 2-3.4-1.6-1.5v-2.3L20.5 8l-2-3.4-2 .8-2-.9L14 3Z" /><circle cx="12" cy="11.4" r="3" /></>,
  edit: <><path d="m14 5 5 5M4 20l5-1 11-11a2.1 2.1 0 0 0-5-3L4 16Z" /></>,
  back: <path d="m14 5-7 7 7 7" />,
  forward: <path d="m10 5 7 7-7 7" />,
  shuffle: <><path d="M3 7h3c5 0 7 10 12 10h3m-4-4 4 4-4 4M3 17h3c1.3 0 2.5-.8 3.5-2M14.5 9C15.6 7.7 16.7 7 18 7h3m-4-4 4 4-4 4" /></>,
  volume: <><path d="m11 4-5 4H3v8h3l5 4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />
}

export default function Icon({ name }: { name: IconName }) {
  return <svg className="ui-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{shapes[name]}</svg>
}
