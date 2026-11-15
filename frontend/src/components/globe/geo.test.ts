import {describe,it,expect} from 'vitest';
import {positionFromLatLon} from './geo';
describe('spherical coordinates',()=>{it('maps equatorial prime meridian to globe front',()=>{const [x,y,z]=positionFromLatLon(0,0);expect(x).toBeCloseTo(0);expect(y).toBeCloseTo(0);expect(z).toBeCloseTo(2);});it('maps north pole to top',()=>{const [x,y,z]=positionFromLatLon(90,20);expect(x).toBeCloseTo(0);expect(y).toBeCloseTo(2);expect(z).toBeCloseTo(0);});});
