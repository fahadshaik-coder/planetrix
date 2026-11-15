import {describe,it,expect} from 'vitest';
import {applyElevations} from './api';
import type {Cell} from './api';
const base:Cell={id:'a',bounds:{south:0,north:10,west:0,east:10},latitude:5,longitude:5,status:'unassessed',elevation_m:null,similarity_percent:null,evidence:null};
describe('evidence-safe geographic screening',()=>{
 it('keeps absent data missing, not zero',()=>{
  expect(applyElevations([base],[])[0].elevation_m).toBeNull();
 });
 it('preserves real zero elevation and does not invent planetary similarity',()=>{
  const c=applyElevations([base],[{latitude:5,longitude:5,status:'sampled',elevation_m:0,retrieved_at:'now',provenance:{source:'test',url:'',citation:'',unit:'m',method:''}}])[0];
  expect(c.elevation_m).toBe(0);expect(c.similarity_percent).toBeNull();
 });
});
