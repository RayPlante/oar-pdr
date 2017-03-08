"""
Tools for building a NIST Preservation bags
"""
import os, errno, logging, re, json
from shutil import copy2 as filecopy
from copy import deepcopy
from collections import Mapping

from ..exceptions import (SIPDirectoryError, SIPDirectoryNotFound, 
                          ConfigurationException, StateException, PODError)
from .. import PreservationSystem
from ....nerdm.exceptions import (NERDError, NERDTypeError)
from ....nerdm.convert import PODds2Res

NORM=15  # Log Level for recording normal activity
logging.addLevelName(NORM, "NORMAL")
log = logging.getLogger(__name__)

DEF_BAGLOG_FORMAT = "%(asctime)s %(levelname)s: %(message)s"

DEF_MBAG_VERSION = "0.2"

POD_FILENAME = "pod.json"
NERDMD_FILENAME = "nerdm.json"
FILEMD_FILENAME = NERDMD_FILENAME
RESMD_FILENAME  = NERDMD_FILENAME
COLLMD_FILENAME = NERDMD_FILENAME

ANNOT_FILENAME = "annot.json"
FILEANNOT_FILENAME = ANNOT_FILENAME
RESANNOT_FILENAME  = ANNOT_FILENAME
COLLANNOT_FILENAME = ANNOT_FILENAME

NERD_PRE = "nrd"
NERDPUB_PRE = "nrdp"
NERDM_SCH_ID_BASE = "https://www.nist.gov/od/dm/nerdm-schema/"
NERDMPUB_SCH_ID_BASE = "https://www.nist.gov/od/dm/nerdm-schema/pub/"
NERDM_SCH_VER = "v0.1"
NERDMPUB_SCH_VER = NERDM_SCH_VER
NERDM_SCH_ID = NERDM_SCH_ID_BASE + NERDM_SCH_VER + "#"
NERDMPUB_SCH_ID = NERDMPUB_SCH_ID_BASE + NERDMPUB_SCH_VER + "#"
NERD_DEF = NERDM_SCH_ID + "/definitions/"
NERDPUB_DEF = NERDMPUB_SCH_ID + "/definitions/"
DATAFILE_TYPE = NERDPUB_PRE + ":DataFile"
SUBCOLL_TYPE = NERDPUB_PRE + ":Subcollection"

def find_jq_lib(config=None):
    """
    return the directory containing the location of the jq libraries
    """
    def assert_exists(dir, ctxt=""):
        if not os.path.exists(dir):
            "{0}directory does not exist: {1}".format(ctxt, dir)
            raise ConfigurationException(msg)

    # check local configuration
    if config and 'jq_lib' in config:
        assert_exists(config['jq_lib'], "config param 'jq_lib' ")
        return config['jq_lib']
            
    # check environment variable
    if 'OAR_JQ_LIB' in os.environ:
        assert_exists(os.environ['OAR_JQ_LIB'], "env var OAR_JQ_LIB ")
        return os.environ['OAR_JQ_LIB']

    # look relative to a base directory
    if 'OAR_HOME' in os.environ:
        # this is normally an installation directory (where lib/jq is our
        # directory) but we also allow it to be the source directory
        assert_exists(os.environ['OAR_HOME'], "env var OAR_HOME ")
        basedir = os.environ['OAR_HOME']
        candidates = [os.path.join(basedir, 'lib', 'jq'),
                      os.path.join(basedir, 'jq')]
    else:
        # guess some locations based on the location of the executing code.
        # The code might be coming from an installation, build, or source
        # directory.
        import nistoar
        basedir = os.path.dirname(os.path.dirname(os.path.dirname(
                                            os.path.abspath(nistoar.__file__))))
        candidates = [os.path.join(basedir, 'jq')]
        basedir = os.path.dirname(os.path.dirname(basedir))
        candidates.append(os.path.join(basedir, 'jq'))
    for dir in candidates:
        if os.path.exists(dir):
            return dir
        
    return None

def_jq_libdir = find_jq_lib()

class BagBuilder(PreservationSystem):
    """
    A class for building up and populating a BagIt bag compliant with the 
    NIST Profile.
    """

    def __init__(self, parentdir, bagname, config=None, logger=None):
        """
        create the Builder to build a bag with a given name

        :param parentdir str:  the directory that will contain the bag's root 
                                 directory
        :param bagname str:    the name to give to the bag
        :param config dict:    a dictionary of configuration data (see class
                                 documentation for supported parameters). 
        :param logger Logger:  a Logger object to send messages to.  This will 
                                 used to send messages to a preservation log
                                 inside the bag.  
        """
        if not os.path.exists(parentdir):
            raise StateException("Bag Workspace dir does not exist: " +
                                 parentdir)
            
        self._name = bagname
        self._pdir = parentdir
        self._bagdir = os.path.join(self._pdir, self._name)

        if not config:
            config = {}
        self.cfg = config
        
        if not logger:
            logger = log
        self.log = logger
        self.log.setLevel(NORM)
        self._logname = self.cfg.get('log_filename', 'preserv.log')
        self._loghdlr = None

        jqlib = self.cfg.get('jq_lib', def_jq_libdir)
        self.pod2nrd = PODds2Res(jqlib)


    @property
    def bagname(self):
        return self._name

    @property
    def bagdir(self):
        return self._bagdir

    @property
    def logname(self):
        return self._logname

    def ensure_bagdir(self):
        """
        ensure that the working bag directory exists with the proper name
        an that we can write to it.  
        """
        didit = False
        if not os.path.exists(self.bagdir):
            try:
                os.mkdir(self.bagdir)
                didit = True
            except OSError, e:
                raise StateException("Unable to create bag directory: "+
                                     self.bagdir+": "+str(e), cause=e)

        if not os.access(self.bagdir, os.R_OK|os.W_OK|os.X_OK):
            raise StateException("Insufficient permissions on bag directory: " +
                                 self.bagdir)

        if not self._loghdlr:
            self._set_logfile()
        if didit:
            self.record("Created bag with name, %s", self.bagname)    

    def _set_logfile(self):
        if self._loghdlr:
            self._unset_logfile()
        filepath = os.path.join(self.bagdir, self.logname)
        self._loghdlr = logging.FileHandler(filepath)
        # self._loghdlr.setLevel(NORM)
        fmt = self.cfg.get('bag_log_format', DEF_BAGLOG_FORMAT)
        self._loghdlr.setFormatter(logging.Formatter(fmt))
        self.log.addHandler(self._loghdlr)
        
    def _unset_logfile(self):
        if self._loghdlr:
            self.log.removeHandler(self._loghdlr)
            self._loghdlr.close()
            self._loghdlr = None

    def ensure_bag_structure(self):
        """
        make sure that the working bag contains the basic directory structure--
        namely, has data and metadata directories.  
        """
        self.ensure_bagdir()

        dirs = [ "data", "metadata" ]
        self._extend_file_list(dirs, 'extra_tag_dirs')

        for dir in dirs:
            dir = os.path.join(self.bagdir, dir)
            if not os.path.exists(dir):
                os.mkdir(dir)

    def ensure_coll_dirs(self, destpath):
        """
        ensure that the directories to contain a subcollection with a given 
        path and its metadata exist.

        :param destpath str:   the desired path for the file relative to the 
                               root of the dataset.
        """
        destpath = os.path.normpath(destpath)
        if os.path.isabs(destpath) or destpath.startswith(".."+os.sep):
            raise ValueError("ensure_datafile_dirs: destpath cannot be an "
                             "absolute path")

        ddir = os.path.join(self.bagdir, "data")
        if not os.path.exists(ddir):
            self.ensure_bag_structure()

        path = os.path.join(ddir, destpath)
        try:
            if not os.path.exists(path):
                os.makedirs(path)
        except Exception, ex:
            pdir = os.path.join(os.path.basename(self.bagdir), "data", pdir)
            raise StateException("Failed to create directory tree ({0}): {1}"
                                 .format(str(ex), pdir), cause=ex)

        self.ensure_metadata_dirs(destpath)

    def ensure_metadata_dirs(self, destpath):

        path = os.path.join(self.bagdir, "metadata", destpath)
        try:
            if not os.path.exists(path):
                os.makedirs(path)
        except Exception, ex:
            pdir = os.path.join(os.path.basename(self.bagdir),
                                "metadata", destpath)
            raise StateException("Failed to create directory tree ({0}): {1}"
                                 .format(str(ex), pdir), cause=ex)
        

    def ensure_datafile_dirs(self, destpath):
        """
        ensure that the directories to contain a data file with a given 
        path and its metadata exist.

        :param destpath str:   the desired path for the file relative to the 
                               root of the dataset.
        """
        destpath = os.path.normpath(destpath)
        if os.path.isabs(destpath) or destpath.startswith(".."+os.sep):
            raise ValueError("ensure_datafile_dirs: destpath cannot be an "
                             "absolute path")

        ddir = os.path.join(self.bagdir, "data")
        if not os.path.exists(ddir):
            self.ensure_bag_structure()

        pdir = os.path.dirname(destpath)
        if pdir:
            path = os.path.join(ddir, pdir)
            try:
                if not os.path.exists(path):
                    os.makedirs(path)
            except Exception, ex:
                pdir = os.path.join(os.path.basename(self.bagdir), "data", pdir)
                raise StateException("Failed to create directory tree ({0}): {1}"
                                     .format(str(ex), pdir), cause=ex)

        self.ensure_metadata_dirs(destpath)
        
    def _extend_file_list(self, filelist, param):
        extras = self.cfg.get(param)
        if extras:
            if isinstance(extras, (str, unicode)):
                extras = [ extras ]
            if hasattr(extras, '__iter__'):
                bad = [f for f in extras if not isinstance(f, (str, unicode))]
                if bad:
                    self.log.warn("Ignoring entries in config param, "+param+
                                  ", with non-string type: " + str(bad))
                    extras = [f for f in extras if isinstance(f, (str, unicode))]
                filelist.extend(extras)
            else:
                self.log.warn("Ignoring config param, 'extra_tag_dirs': " +
                              "wrong value type: " + str(extras))

    def add_data_file(self, destpath, srcpath=None, hardlink=False, initmd=True):
        """
        add a data file to the bag.  This creates directories representing it in 
        both the data and metadata directories.  If a srcpath is provided, the 
        file will actually be copied into the data directory.  If the file is 
        provided and initmd is True, the metadata for the file will be 
        initialized and placed in the metadata directory.  

        :param destpath str:   the desired path for the file relative to the 
                               root of the dataset.
        :param scrpath str:    the path to an existing file to copy into the 
                               bag's data directory.
        :param hardlink bool:  If True, attempt to create a hard link to the 
                               file instead of copying it.  For this to be 
                               successful, the bag directory and the srcpath
                               must be on the same filesystem.  A hard copy 
                               will be attempted if linking fails if the 
                               configuration option 'copy_on_link_failure' is
                               not false.
        :param initmd bool:    If True and a file is provided, the file will 
                               be examined and extraction of metadata will be 
                               attempted.  Resulting metadata will be written 
                               into the metadata directory. 
        """
        self.ensure_datafile_dirs(destpath)
        outfile = os.path.join(self.bagdir, 'data', destpath)

        if srcpath:
            if hardlink:
                try:
                    os.link(srcpath, outfile)
                    self.record("Added data file at "+destdir)
                except OSError, ex:
                    msg = "Unable to create link for data file ("+ destpath + \
                          "): "+ str(ex)
                    if self.cfg.get('copy_on_link_failure', True):
                        hardlink = False
                        self.log.warning(msg)
                    else:
                        self.log.exception(msg, exc_info=True)
                        raise StateException(msg)
            if not hardlink:
                try:
                    filecopy(srcpath, outfile)
                    self.record("Added data file at "+destpath)
                except Exception, ex:
                    msg = "Unable to copy data file (" + srcpath + \
                          ") into bag (" + outfile + "): " + str(ex)
                    self.log.exception(msg, exc_info=True)
                    raise StateException(msg, cause=ex)
    
        if initmd:
            self.init_filemd_for(destpath, write=True, examine=srcpath)
            
    def add_metadata_for_file(self, destpath, mdata):
        """
        write metadata for the component at the given destination path to the 
        proper location under the metadata directory.

        This implementation will provide default values for key values that 
        are missing.
        """
        if not isinstance(mdata, Mapping):
            raise NERDTypeError("dict", type(mdata), "NERDm Component")
        
        md = self._create_init_filemd_for(destpath)
        md.update(mdata)
        
        try:
            if not isinstance(md['@type'], list):
                raise NERDTypeError('list', str(mdata['@type']), '@type')

            if DATAFILE_TYPE not in md['@type']:
                md['@type'].append(DATAFILE_TYPE)
                    
        except TypeError, ex:
            raise NERDTypeError(msg="Unknown DataFile property type error",
                                cause=ex)

        self.ensure_metadata_dirs(destpath)
        self._write_json(md, self.nerdm_file_for(destpath))

    def add_metadata_for_coll(self, destpath, mdata):
        """
        write metadata for the component at the given destination path to the 
        proper location under the metadata directory.
        """
        if not isinstance(mdata, Mapping):
            raise NERDTypeError("dict", type(mdata), "NERDm Component")
        
        md = self._create_init_collmd_for(destpath)
        md.update(mdata)
        
        try:
            if not isinstance(md['@type'], list):
                raise NERDTypeError('list', str(md['@type']), '@type')

            if SUBCOLL_TYPE not in md['@type']:
                md['@type'].append(SUBCOLL_TYPE)
                    
        except TypeError, ex:
            raise NERDTypeError(msg="Unknown DataFile property type error",
                                cause=ex)

        self.ensure_metadata_dirs(destpath)
        self._write_json(md, self.nerdm_file_for(destpath))

    def nerdm_file_for(self, destpath):
        """
        return the path to NERDm metadata file that corresponds to a data file
        or subcollection with the given collection path.

        :param destpath str:  the path to the data file relative to the 
                              dataset's root.
        """
        return os.path.join(self.bagdir, "metadata", destpath, FILEMD_FILENAME)

    def annot_file_for(self, destpath):
        """
        return the path to NERDm metadata file that corresponds to a data file
        or subcollection with the given collection path.

        :param destpath str:  the path to the data file relative to the 
                              dataset's root.
        """
        return os.path.join(self.bagdir, "metadata", destpath,
                            FILEANNOT_FILENAME)

    def init_filemd_for(self, destpath, write=False, examine=False):
        """
        create some initial file metadata for a file at a given path.

        :param destpath str:  the path to the data file relative to the 
                              dataset's root.
        :param write   bool:  if True, write the metadata into its proper 
                              location in the bag.  This will overwrite 
                              any existing (non-annotation) metadata.  
        :param examine bool:  if True, examine the file and surmise and 
                              extract additional metadata.
        """
        mdata = self._create_init_filemd_for(destpath)
        if examine:
            datafile = os.path.join(self.bagdir, "data", destpath)
            if os.path.exists(datafile):
                self._add_extracted_metadata(datafile, mdata,
                                             self.cfg.get('file_md_extract'))
            else:
                log.warn("Unable to examine data file: doesn't exist yet: " +
                         destpath)
        if write:
            self.add_metadata_for_file(destpath, mdata)

        return mdata

    def init_collmd_for(self, destpath, write=False, examine=False):
        """
        create some initial subcollection metadata for a folder at a given path.

        :param destpath str:  the path to the folder relative to the 
                              dataset's root.
        :param write   bool:  if True, write the metadata into its proper 
                              location in the bag.  This will overwrite 
                              any existing (non-annotation) metadata.  
        :param examine bool:  if True, examine all files below the collection
                              to extract additional metadata.
        """
        mdata = self._create_init_collmd_for(destpath)
        if examine:
            colldir = os.path.join(self.bagdir, "data", destpath)
            if os.path.exist(datafile):
                self._add_extracted_metadata(datafile, mdata,
                                             self.cfg.get('file_md_extract'))
            else:
                log.warn("Unable to examine data file: doesn't exist yet: " +
                         destpath)
        if write:
            self.add_metadata_for_coll(destpath, mdata)

        return mdata

    def _write_json(self, jsdata, destfile):
        indent = self.cfg.get('json_indent', 4)
        try:
            with open(destfile, 'w') as fd:
                json.dump(jsdata, fd, indent=indent, separators=(',', ': '))
        except Exception, ex:
            raise StateException("{0}: Failed to write JSON data to file: {1}"
                                 .format(destfile, str(ex)), cause=ex)

    def _add_extracted_metadata(self, dfile, mdata, config):
        pass

    def _create_init_filemd_for(self, destpath):
        out = {
            "@id": "cmps/" + destpath,
            "@type": [ ":".join([NERDPUB_PRE, "DataFile"]) ],
            "filepath": destpath,
            "_extensionSchemas": [ NERDPUB_DEF + "DataFile" ]
        }
        return out

    def _create_init_collmd_for(self, destpath):
        out = {
            "@id": "cmps/" + destpath,
            "@type": [ ":".join([NERDPUB_PRE, "Subcollection"]) ],
            "filepath": destpath,
            "_extensionSchemas": [ NERDPUB_DEF + "Subcollection" ]
        }
        return out
    
    def finalize_bag(self):
        """
        Assume that all needed data and minimal metadata have been added to the
        bag and fill out the remaining bag components to complete the bag.

        The following configuration paramters will control activities are 
        included in the finalizing step:
          :param 'examine' bool:   if True, this will ensure that all files have
                                     been examined and had metadata extracted.  
          :param 'trim_folders' bool:  if True, remove all empty data directories

        :return list:  a list of errors encountered while trying to complete
                       the bag.  An empty bag indicates that the bag is complete
                       and ready to preserved.  
        """
        raise NotImplemented

    def __del__(self):
        self._unset_logfile()

    def validate(self):
        """
        Determine if the bag is complete and compliant with the NIST BagIt
        profile.

        :return list:  a list of errors indicating where the bag is incomplete
                       or non-compliant.  An empty bag indicates that the bag 
                       is complete and ready to preserved.  
        """
        raise NotImplemented

    def record(self, msg, *args, **kwargs):
        """
        record a message indicating a relevent change made to this bag to 
        go into this bag's log file.  
        """
        self.log.log(NORM, msg, *args, **kwargs)

    def add_res_nerd(self, mdata, savefilemd=True):
        """
        write out the resource-level NERDm data into the bag.  

        :param mdata      dict:  the JSON object containing the NERDm Resource 
                                   metadata
        :param savefilemd bool:  if True (default), any DataFile or 
                                   Subcollection metadata will be split off and 
                                   saved in the appropriate locations for 
                                   file metadata.
        """
        self.ensure_bag_structure()
        
        # validate type
        if mdata.get("_schema") != NERDM_SCH_ID:
            if self.cfg.get('ensure_nerdm_type_on_add', True):
                raise NERDError("Not a NERDm Resource Record; wrong schema id: "+
                                str(mdata.get("_schema")))
            else:
                self.log.warning("provided NERDm data does not look like a "+
                                 "Resource record")
        
        if "components" in mdata:
            components = mdata['components']
            if not isinstance(components, list):
                raise NERDTypeError("list", str(type(mdata['components'])),
                                    'components')
            for i in range(len(components)-1, -1, -1):
                if DATAFILE_TYPE in components[i].get('@type',[]):
                    if savefilemd and 'filepath' not in components[i]:
                        msg = "DataFile missing 'filepath' property"
                        if '@id' in components[i]:
                            msg += " ({0})".format(components[i]['@id'])
                        self.warning(msg)
                    else:
                        if savefilemd:
                            self.add_metadata_for_file(components[i]['filepath'],
                                                       components[i])
                        components.pop(i)
                            
                elif SUBCOLL_TYPE in components[i].get('@type',[]):
                    if savefilemd and 'filepath' not in components[i]:
                        msg = "Subcollection missing 'filepath' property"
                        if '@id' in components[i]:
                            msg += " ({0})".format(components[i]['@id'])
                        self.warning(msg)
                    else:
                        if savefilemd:
                            self.add_metadata_for_coll(components[i]['filepath'],
                                                       components[i])
                        components.pop(i)
                            
        self._write_json(mdata, self.nerdm_file_for(""))
                                             

    def add_ds_pod(self, pdata, convert=True, savefilemd=True):
        """
        write out the dataset-level POD data into the bag.

        :param pdata dict:   the JSON object containing the POD Dataset metadata
        :param convert bool: if True, in addition to writing the POD file, it 
                             will be converted to NERDm data and written out 
                             as well.
        :param savefilemd bool:  if True (default) and convert=True, any DataFile
                             or Subcollection metadata will be split off and 
                             saved in the appropriate locations for file 
                             metadata.
        """
        if not isinstance(pdata, Mapping):
            raise NERDTypeError("dict", type(pdata), "POD Dataset")

        self._write_json(mdata,
                         os.path.join(self.bagdir, "metadata", POD_FILENAME))
        
        if convert:
            mdata = self.pod2res.convert_data(pdata, self.mint_id())
            self.add_res_nerd(mdata, savefilemd)

        
    def add_annotation_for(self, destpath, mdata):
        """
        add the given data as annotations to the metadata for the file or 
        collection with the given path.  This metadata represents updates to 
        the base level metadata.  This metadata will be merged in with the 
        base level to create the final NERDm metadata (when finalize_bad() is 
        called).  

        :param destpath str:   the desired path for the file relative to the 
                               root of the dataset.  An empty string means that
                               the annotation should be associated with the 
                               resource-level metadata.
        :param mdata Mapping:  a dictionary with the annotating metadata.
        """
        if not isinstance(mdata, Mapping):
            raise NERDTypeError("dict", type(mdata), "Annotation data")
        self.ensure_metadata_dirs(destpath)
        self._write_json(mdata, self.annot_file_for(destpath))
    
