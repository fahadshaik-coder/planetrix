import {useState} from 'react';
import {Database,ExternalLink,PanelRightClose,RefreshCw} from 'lucide-react';
import type {EarthEvent,PdsFeed,EarthEventFeed} from '../../services/liveScience';
import type {PlanetaryBody} from '../../types/scientific';
interface Props {target:PlanetaryBody;events:EarthEventFeed|null;products:PdsFeed|null;selectedId:string|null;onSelect:(id:string)=>void;onClose:()=>void;refresh:()=>void;loading:boolean;errors:string[];}
export function LiveScienceSidebar({target,events,products,selectedId,onSelect,onClose,refresh,loading,errors}:Props){
 const [search,setSearch]=useState('');
 const matches=(event:EarthEvent)=>event.title.toLowerCase().includes(search.toLowerCase());
 return <aside className="rank-sidebar live-science-sidebar" id="rankings"><div className="sidebar-head"><div><span className="eyebrow"><Database size={13}/> OFFICIAL NASA SOURCE FEEDS</span><h2>Live scientific data</h2><p>NASA PDS {target.toUpperCase()} archive + NASA EONET Earth events</p></div><button className="icon-button mobile-only" aria-label="Close scientific data" onClick={onClose}><PanelRightClose size={19}/></button></div>
 <div className="live-info"><b>NOT ANALOG MATCHES</b><p>Archive metadata and current/recent Earth natural events. Similarity scores are unavailable until PLANETREX computes validated comparisons.</p><button className="outline-action" onClick={refresh} disabled={loading}><RefreshCw size={13}/>{loading?'LOADING':'REFRESH NASA DATA'}</button></div>
 {errors.length>0&&<div className="live-errors" role="alert">{errors.map((error,i)=><p key={i}>{error}</p>)}</div>}
 <div className="list-head"><span>EARTH NATURAL EVENTS</span><span>{events?.events.length??0} GEOLOCATED</span></div>
 <div className="live-search"><input aria-label="Search Earth events" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search NASA Earth events…"/></div>
 <div className="ranking-list live-scroll">{events?.events.filter(matches).map(event=><button key={event.id} className={`live-entry ${selectedId===event.id?'active':''}`} onClick={()=>onSelect(event.id)}><strong>{event.title}</strong><span>{event.categories.join(', ')||'Natural event'} · {event.date?new Date(event.date).toLocaleDateString():'Date not provided'}</span></button>)}{events&&events.events.length===0&&<p className="live-empty">No point-based Earth events returned.</p>}{!events&&!loading&&<p className="live-empty">Earth events unavailable.</p>}</div>
 <div className="list-head"><span>{target.toUpperCase()} PDS ARCHIVE RECORDS</span><span>{products?.products.length??0} PRODUCTS</span></div>
 <div className="ranking-list live-scroll">{products?.products.map(product=><div key={product.id} className="live-product"><strong>{product.title}</strong><small>{product.product_class}</small><span>{product.id}</span></div>)}{products&&products.products.length===0&&<p className="live-empty">No PDS products returned for this query.</p>}{!products&&!loading&&<p className="live-empty">Planetary archive unavailable.</p>}</div>
 <footer className="sidebar-footer"><ExternalLink size={11}/><a href="https://pds.nasa.gov/" target="_blank" rel="noreferrer">NASA PDS</a> · <a href="https://eonet.gsfc.nasa.gov/" target="_blank" rel="noreferrer">NASA EONET</a></footer></aside>;
}
