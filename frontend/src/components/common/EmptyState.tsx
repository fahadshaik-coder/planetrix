import {SearchX} from 'lucide-react';
export function EmptyState({message}:{message:string}){return <div className="empty"><SearchX size={22}/><p>{message}</p></div>}
