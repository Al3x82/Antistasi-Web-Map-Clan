import json
import pathlib
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'exporter'))
import sync
from front_support import enrich,troop_count

class ExportTests(unittest.TestCase):
    def test_garrison_formats(self):
        self.assertEqual(troop_count({'troops':['rifle','medic']},'rebels'),2)
        self.assertEqual(troop_count({'troops':[8,0.7]},'occupants'),8)
        self.assertEqual(troop_count({'troops':[]},'rebels'),0)
        self.assertIsNone(troop_count({},'rebels'))
        self.assertIsNone(troop_count({'troops':[True,1]},'invaders'))

    def test_radius_and_destroyed(self):
        sites=[{'id':'a','type':'outpost','side':'occupants','destroyed':False},{'id':'b','type':'city','side':'rebels','destroyed':True}]
        enrich(sites,{'newGarrison':{'a':{'troops':[1000,1]}}},{})
        self.assertEqual(sites[0]['influence_radius_m'],4000)
        self.assertEqual(sites[1]['influence_radius_m'],0)
        self.assertIsNone(sites[1]['garrison_count'])

    def test_local_publish_replaces_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=pathlib.Path(tmp);(root/'site/data').mkdir(parents=True)
            src=root/'input.json';src.write_text('{"sites":[]}')
            target=root/'site/data/campaign.json';target.write_text('old')
            sync.upload(src,{'mode':'local','local_dir':str(root/'site')})
            self.assertEqual(target.read_bytes(),src.read_bytes())
            self.assertEqual(target.stat().st_mode&0o777,0o644)
            self.assertEqual(len(list(target.parent.iterdir())),1)

    def test_sftp_uses_strict_host_and_atomic_rename(self):
        cfg={'mode':'sftp','remote_dir':'/site','host':'web.example.org','user':'mapupload','key':'/key','port':2222}
        with patch('sync.subprocess.run') as run:
            sync.upload('/tmp/campaign.json',cfg)
        args=run.call_args.args[0];batch=run.call_args.kwargs['input']
        self.assertIn('-oStrictHostKeyChecking=yes',args)
        self.assertIn('2222',args)
        self.assertIn('campaign.json.upload',batch)
        self.assertIn('rename ',batch)

    def test_unknown_mode_rejected(self):
        with self.assertRaises(ValueError):sync.upload('/tmp/test',{'mode':'typo'})

    def test_invalid_coordinates(self):
        for xy in [[-1,0],[0,40000],[float('nan'),0]]:
            with self.assertRaises(ValueError):sync.position(xy)

if __name__=='__main__':unittest.main()
