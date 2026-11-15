// Three.js globe convention: longitude 0 on the front (+Z); positive latitude north.
export function positionFromLatLon(lat:number,lon:number,radius=2):[number,number,number]{const phi=(90-lat)*Math.PI/180; const theta=lon*Math.PI/180;return [radius*Math.sin(phi)*Math.sin(theta),radius*Math.cos(phi),radius*Math.sin(phi)*Math.cos(theta)];}
