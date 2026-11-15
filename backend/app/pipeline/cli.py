"""Manual administrator operations. Run as: python -m app.pipeline.cli --help"""
from __future__ import annotations
import argparse
import asyncio
import json
from pathlib import Path

from app.discovery.grid import Bounds, make_grid
from app.pipeline.core import import_reference, scan_earth_centers, search


def main() -> None:
    parser=argparse.ArgumentParser(description="PLANETREX manually controlled terrain-science pilot")
    sub=parser.add_subparsers(dest="action",required=True)
    scan=sub.add_parser("scan",help="Sample real DEM values and store local terrain profiles")
    scan.add_argument("--south",type=float,required=True);scan.add_argument("--north",type=float,required=True)
    scan.add_argument("--west",type=float,required=True);scan.add_argument("--east",type=float,required=True)
    scan.add_argument("--step",type=float,default=2)
    scan.add_argument("--limit",type=int,default=10)
    scan.add_argument("--spacing-m",type=float,default=1000)
    imp=sub.add_parser("import-reference",help="Import vetted external Moon/Mars terrain measurements")
    imp.add_argument("file",type=Path)
    comp=sub.add_parser("compare",help="Screen all processed Earth profiles against a reference")
    comp.add_argument("reference_id");comp.add_argument("--limit",type=int,default=20)
    args=parser.parse_args()
    if args.action=="scan":
        if not 1<=args.limit<=30: parser.error("--limit must be 1..30")
        cells=make_grid(Bounds(args.south,args.north,args.west,args.east),args.step)
        result=asyncio.run(scan_earth_centers(cells[:args.limit],args.spacing_m))
    elif args.action=="import-reference":result=import_reference(args.file)
    else:result=search(args.reference_id,limit=args.limit)
    print(json.dumps(result,indent=2))

if __name__=="__main__":main()
