import os, sys, pdb, shutil, logging, json
from cStringIO import StringIO
from io import BytesIO
import warnings as warn
import unittest as test
from collections import OrderedDict

from nistoar.tests import *
import nistoar.pdr.preserv.bagit.builder as bldr
import nistoar.pdr.preserv.exceptions as exceptions

# datadir = nistoar/preserv/tests/data
datadir = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "tests", "data", "simplesip"
)

def setUpModule():
    ensure_tmpdir()
#    logging.basicConfig(filename=os.path.join(tmpdir(),"test_builder.log"),
#                        level=logging.INFO)
    rootlog = logging.getLogger()
    hdlr = logging.FileHandler(os.path.join(tmpdir(),"test_builder.log"))
    hdlr.setLevel(logging.INFO)
    hdlr.setFormatter(logging.Formatter(bldr.DEF_BAGLOG_FORMAT))
    rootlog.addHandler(hdlr)

def tearDownModule():
    rmtmpdir()

class TestBuilder(test.TestCase):

    testsip = os.path.join(datadir, "simplesip")

    def setUp(self):
        self.tf = Tempfiles()
        self.bag = bldr.BagBuilder(self.tf.root, "testbag")
        self.tf.track("testbag")

    def tearDown(self):
        self.bag._unset_logfile()
        self.bag = None
        self.tf.clean()

    def test_ctor(self):
        self.assertEqual(self.bag.bagname, "testbag")
        self.assertEqual(self.bag.bagdir, os.path.join(self.tf.root, "testbag"))
        self.assertTrue(self.bag.log)
        self.assertFalse(self.bag._loghdlr)
        self.assertEqual(self.bag.logname, "preserv.log")

    def test_ensure_bagdir(self):
        self.bag.ensure_bagdir()

        self.assertTrue(os.path.exists(self.bag.bagdir))

    def test_logging(self):
        self.test_ensure_bagdir()
        
        # test log setup
        self.assertTrue(self.bag._loghdlr)
        self.bag.record("First message")
        self.bag.log.warn("Warning")
        self.bag.log.debug("oops")
#        self.bag._unset_logfile()
        logfile = os.path.join(self.bag.bagdir,self.bag.logname)
        self.assertTrue(os.path.exists(logfile))
        with open(logfile) as fd:
            lines = fd.readlines()
        self.assertEqual(len(lines), 3)
        self.assertIn("Created ", lines[0])
        self.assertIn(self.bag.bagname, lines[0])
        self.assertIn("First message", lines[1])
        self.assertIn("Warning", lines[2])

    def test_ensure_bag_structure(self):
        self.bag.ensure_bag_structure()

        self.assertTrue(os.path.exists(self.bag.bagdir))
        self.assertTrue(os.path.exists(os.path.join(self.bag.bagdir,"data")))
        self.assertTrue(os.path.exists(os.path.join(self.bag.bagdir,"metadata")))

        # test indepodent and extra directories
        self.bag.cfg['extra_tag_dirs'] = ['metameta']
        self.bag.ensure_bag_structure()

        self.assertTrue(os.path.exists(self.bag.bagdir))
        self.assertTrue(os.path.exists(os.path.join(self.bag.bagdir,"data")))
        self.assertTrue(os.path.exists(os.path.join(self.bag.bagdir,"metadata")))
        self.assertTrue(os.path.exists(os.path.join(self.bag.bagdir,"metameta")))
        
    def test_ensure_datafile_dirs(self):
        ddir = os.path.join("trial1","gold")
        path = os.path.join(ddir,"file.dat")
        self.bag.ensure_datafile_dirs(path)

        self.assertTrue(os.path.exists(self.bag.bagdir))
        self.assertTrue(os.path.exists(os.path.join(self.bag.bagdir,"data")))
        self.assertTrue(os.path.exists(os.path.join(self.bag.bagdir,"metadata")))
        self.assertTrue(os.path.exists(os.path.join(self.bag.bagdir,"metadata")))
        
        self.assertTrue(os.path.exists(os.path.join(self.bag.bagdir,
                                                    "data",ddir)))
        self.assertTrue(os.path.exists(os.path.join(self.bag.bagdir,
                                                    "metadata",path)))

        # is indepotent
        self.bag.ensure_datafile_dirs(path)
        self.assertTrue(os.path.exists(os.path.join(self.bag.bagdir,
                                                    "data",ddir)))
        self.assertTrue(os.path.exists(os.path.join(self.bag.bagdir,
                                                    "metadata",path)))

        # test illegal paths
        with self.assertRaises(Exception):
            self.bag.ensure_datafile_dirs("/foo/bar")
        with self.assertRaises(Exception):
            self.bag.ensure_datafile_dirs("foo/../../bar")

    def test_ensure_coll_dirs(self):
        path = os.path.join("trial1","gold")
        self.bag.ensure_coll_dirs(path)

        self.assertTrue(os.path.exists(self.bag.bagdir))
        self.assertTrue(os.path.exists(os.path.join(self.bag.bagdir,"data")))
        self.assertTrue(os.path.exists(os.path.join(self.bag.bagdir,"metadata")))
        
        self.assertTrue(os.path.exists(os.path.join(self.bag.bagdir,
                                                    "data",path)))
        self.assertTrue(os.path.exists(os.path.join(self.bag.bagdir,
                                                    "metadata",path)))

        # is indepotent
        self.bag.ensure_coll_dirs(path)
        self.assertTrue(os.path.exists(os.path.join(self.bag.bagdir,
                                                    "data",path)))
        self.assertTrue(os.path.exists(os.path.join(self.bag.bagdir,
                                                    "metadata",path)))

        # test illegal paths
        with self.assertRaises(Exception):
            self.bag.ensure_coll_dirs("/foo/bar")
        with self.assertRaises(Exception):
            self.bag.ensure_coll_dirs("foo/../../bar")

    def test_nerdm_file_for(self):
        path = os.path.join("trial1","gold","file.dat")
        self.assertEquals(self.bag.nerdm_file_for(path),
                      os.path.join(self.bag.bagdir,"metadata",path,"nerdm.json"))
        self.assertEquals(self.bag.nerdm_file_for(""),
                      os.path.join(self.bag.bagdir,"metadata","nerdm.json"))

    def test_annot_file_for(self):
        path = os.path.join("trial1","gold","file.dat")
        self.assertEquals(self.bag.annot_file_for(path),
                      os.path.join(self.bag.bagdir,"metadata",path,"annot.json"))
        self.assertEquals(self.bag.annot_file_for(""),
                      os.path.join(self.bag.bagdir,"metadata","annot.json"))
        
    def test_add_metadata_for_coll(self):
        path = os.path.join("trial1","gold")
        md = { "foo": "bar", "gurn": "goob", "numbers": [ 1,3,5]}
        need = self.bag.init_collmd_for(path)
        need.update(md)

        self.bag.add_metadata_for_coll(path, md)
        mdf = os.path.join(self.bag.bagdir, "metadata", path, "nerdm.json")
        self.assertTrue(os.path.exists(mdf))
        with open(mdf) as fd:
            data = json.load(fd)
        self.assertEquals(data, need)
        
    def test_add_metadata_for_file(self):
        path = os.path.join("trial1","gold", "file.dat")
        md = { "foo": "bar", "gurn": "goob", "numbers": [ 1,3,5]}
        need = self.bag.init_filemd_for(path)
        need.update(md)

        self.bag.add_metadata_for_file(path, md)
        mdf = os.path.join(self.bag.bagdir, "metadata", path, "nerdm.json")
        self.assertTrue(os.path.exists(mdf))
        with open(mdf) as fd:
            data = json.load(fd)
        self.assertEquals(data, need)
        
    def test_init_filemd_for(self):
        path = os.path.join("trial1","gold","file.dat")
        need = {
            "@id": "cmps/"+path,
            "@type": [ "nrdp:DataFile" ],
            "filepath": path,
            "_extensionSchemas": [ "https://www.nist.gov/od/dm/nerdm-schema/pub/v0.1#/definitions/DataFile" ]
        }
        mdf = os.path.join(self.bag.bagdir, "metadata", path, "nerdm.json")
        self.assertFalse(os.path.exists(mdf))

        md = self.bag.init_filemd_for(path)
        self.assertEquals(md, need)
        self.assertFalse(os.path.exists(mdf))

        md = self.bag.init_filemd_for(path, True)
        self.assertTrue(os.path.exists(mdf))
        with open(mdf) as fd:
            data = json.load(fd)
        self.assertEquals(data, md)

    def test_init_collmd_for(self):
        path = os.path.join("trial1","gold")
        md = self.bag.init_collmd_for(path)
        need = {
            "@id": "cmps/"+path,
            "@type": [ "nrdp:Subcollection" ],
            "filepath": path,
            "_extensionSchemas": [ "https://www.nist.gov/od/dm/nerdm-schema/pub/v0.1#/definitions/Subcollection" ]
        }
        mdf = os.path.join(self.bag.bagdir, "metadata", path, "nerdm.json")
        self.assertFalse(os.path.exists(mdf))

        md = self.bag.init_collmd_for(path)
        self.assertEquals(md, need)
        self.assertFalse(os.path.exists(mdf))

        md = self.bag.init_collmd_for(path, True)
        self.assertTrue(os.path.exists(mdf))
        with open(mdf) as fd:
            data = json.load(fd)
        self.assertEquals(data, md)

    def test_add_data_file(self):
        path = os.path.join("trial1","gold","trial1.json")
        bagfilepath = os.path.join(self.bag.bagdir, 'data',path)
        bagmdpath = os.path.join(self.bag.bagdir, 'metadata',path,"nerdm.json")
        self.assertFalse( os.path.exists(bagfilepath) )
        self.assertFalse( os.path.exists(bagmdpath) )

        self.bag.add_data_file(path, os.path.join(datadir,"trial1.json"))
        self.assertTrue( os.path.exists(bagfilepath) )
        self.assertTrue( os.path.exists(bagmdpath) )

        need = {
            "@id": "cmps/"+path,
            "@type": [ "nrdp:DataFile" ],
            "filepath": path,
            "_extensionSchemas": [ "https://www.nist.gov/od/dm/nerdm-schema/pub/v0.1#/definitions/DataFile" ]
        }
        with open(bagmdpath) as fd:
            data = json.load(fd)
        self.assertEqual(data, need)
        
    def test_add_data_no_file(self):
        path = os.path.join("trial1","gold","trial1.json")
        bagfilepath = os.path.join(self.bag.bagdir, 'data',path)
        bagmdpath = os.path.join(self.bag.bagdir, 'metadata',path,"nerdm.json")
        self.assertFalse( os.path.exists(bagfilepath) )
        self.assertFalse( os.path.exists(bagmdpath) )

        self.bag.add_data_file(path)
        self.assertFalse( os.path.exists(bagfilepath) )
        self.assertTrue( os.path.exists(bagmdpath) )

        need = {
            "@id": "cmps/"+path,
            "@type": [ "nrdp:DataFile" ],
            "filepath": path,
            "_extensionSchemas": [ "https://www.nist.gov/od/dm/nerdm-schema/pub/v0.1#/definitions/DataFile" ]
        }
        with open(bagmdpath) as fd:
            data = json.load(fd)
        self.assertEqual(data, need)

    def test_add_res_nerd(self):
        with open(os.path.join(datadir, "_nerdm.json")) as fd:
            mdata = json.load(fd)

        self.bag.add_res_nerd(mdata)
        ddir = os.path.join(self.bag.bagdir,"data")
        mdir = os.path.join(self.bag.bagdir,"metadata")
        nerdfile = os.path.join(mdir,"nerdm.json")
        self.assertTrue(os.path.isdir(ddir))
        self.assertTrue(os.path.isdir(mdir))
        self.assertTrue(os.path.exists(nerdfile))
#        self.assertTrue(os.path.exists(os.path.join(ddir,
#                                "1491_optSortSphEvaluated20160701.cdf")))
        self.assertTrue(os.path.exists(os.path.join(mdir,
                          "1491_optSortSphEvaluated20160701.cdf","nerdm.json")))
#        self.assertTrue(os.path.exists(os.path.join(ddir,
#                                "1491_optSortSphEvaluated20160701.cdf.sha256")))
        self.assertTrue(os.path.exists(os.path.join(mdir,
                    "1491_optSortSphEvaluated20160701.cdf.sha256","nerdm.json")))
        self.assertEqual(len([f for f in os.listdir(mdir)
                                if not f.startswith('.') and
                                   not f.endswith('.json')]), 6)
        
        with open(nerdfile) as fd:
            data = json.load(fd)
        self.assertEqual(data['ediid'], '3A1EE2F169DD3B8CE0531A570681DB5D1491')
        self.assertEqual(len(data['components']), 1)

        with open(os.path.join(mdir,
                  "1491_optSortSphEvaluated20160701.cdf","nerdm.json")) as fd:
            data = json.load(fd)
        self.assertEqual(data['filepath'],"1491_optSortSphEvaluated20160701.cdf")
            
    def test_add_res_nerd_nofilemd(self):
        with open(os.path.join(datadir, "_nerdm.json")) as fd:
            mdata = json.load(fd)

        self.bag.add_res_nerd(mdata, False)
        ddir = os.path.join(self.bag.bagdir,"data")
        mdir = os.path.join(self.bag.bagdir,"metadata")
        nerdfile = os.path.join(mdir,"nerdm.json")
        self.assertTrue(os.path.isdir(ddir))
        self.assertTrue(os.path.isdir(mdir))
        self.assertTrue(os.path.exists(nerdfile))

        self.assertEqual(len([f for f in os.listdir(mdir)
                                if not f.startswith('.') and
                                   not f.endswith('.json')]), 0)

    def test_add_annotation_for(self):
        mdata = { "foo": "bar" }
        self.bag.add_annotation_for("goob", mdata)
        annotfile = os.path.join(self.bag.bagdir,"metadata","goob", "annot.json")
                                 
        self.assertTrue(os.path.isfile(annotfile))

        with open(annotfile) as fd:
            data = json.load(fd)
        self.assertEqual(data, mdata)
                        
        self.bag.add_annotation_for("", mdata)
        annotfile = os.path.join(self.bag.bagdir,"metadata","goob", "annot.json")
        self.assertTrue(os.path.isfile(annotfile))
        
        with open(annotfile) as fd:
            data = json.load(fd)
        self.assertEqual(data, mdata)
        

if __name__ == '__main__':
    test.main()
