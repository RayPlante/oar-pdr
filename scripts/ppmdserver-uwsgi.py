"""
The uWSGI script for launching the metadata server.
"""
import os, sys
import uwsgi
try:
    import nistoar
except ImportError:
    oarpath = os.environ.get('OAR_PYTHONPATH')
    if not oarpath and 'OAR_HOME' in os.environ:
        oarpath = os.path.join(os.environ['OAR_HOME'], "lib", "python")
    if oarpath:
        sys.path.insert(0, oarpath)
    import nistoar

from nistoar.pdr.exceptions import ConfigurationException
from nistoar.pdr.publish.mdserv import wsgi, config

# determine where the configuration is coming from
confsrc = uwsgi.opt.get("oar_config_file")
if not confsrc:
    raise ConfigurationException("ppmdserver: nist-oar configuration not provided")

cfg = config.resolve_configuration(confsrc)
config.configure_log(config=cfg)
application = wsgi.app(cfg)

