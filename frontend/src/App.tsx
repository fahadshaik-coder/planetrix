/**
 * The canonical PLANETREX explorer is served by FastAPI at /explorer.
 * Embedding via Vite's same-origin proxy avoids maintaining two contradictory UIs.
 */
export default function App() {
  return <iframe
    title="PLANETREX Moon-first planetary analog explorer"
    src="/explorer"
    style={{position:'fixed',inset:0,border:0,width:'100%',height:'100dvh',background:'#080d16'}}
  />;
}
