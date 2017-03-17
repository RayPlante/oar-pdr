"""
General purpose utility functions and classes for the preservation package
"""
from . import PublishSystem
from .. import exceptions as _pdrexc
from ..exceptions import PODError, NERDError

class PublishWarning(PublishSystem):
    """
    a mixin class for warnings generated by the preservation system
    """
    pass

class ConfigurationWarning(PublishWarning, _pdrexc.PDRWarning):
    """
    a warning class that indicates that there appears to be an unnatural 
    configuration (if not strictly erroneous) of the preservation system 
    in place.
    """
    pass

class PublishException(PublishSystem):
    """
    a mixin class for exceptions occuring in the preservation system
    """
    pass

class ConfigurationException(PublishException, _pdrexc.PDRException):
    """
    a warning class that indicates that there appears to be an unnatural 
    configuration (if not strictly erroneous) of the preservation system 
    in place.
    """
    pass

class StateException(PublishException, _pdrexc.StateException):
    """
    a class indicating that the Publish system or environment is in 
    an uncorrectable state preventing proper processing
    """
    pass

class SIPDirectoryError(PublishException, _pdrexc.StateException):
    """
    a class indicating a problem with the given directory containing 
    the submission data.
    """
    def __init__(self, dir=None, problem=None, cause=None, msg=None):
        """
        initial the exception.  By default the exception message will
        be formatted by combining the directory name and the problem statement.
        This can be overridden by providing a verbatim message via the msg
        parameter.

        :param dir  str:   the directory giving the problem
        :param problem str:   a statement of what the problem is; this should not
                           include the name of the directroy.
        :param cause Exception:  a caught exception that represents the 
                           underlying cause of the problem.  
        :param msg  str:   a fully formatted to string to use as the exception
                           message instead of one formed by combining the 
                           directory name and its problem.
        """
        self.dir = dir
        if not problem:
            if cause:
                problem = str(cause)
            elif not dir:
                problem = "SIP directory not provided"
        if not msg:
            if dir:
                msg = "Problem with SIP directory, {0}: {1}".format(dir, prob)
            else:
                msg = prob
        super(SIPDirectoryError, self).__init__(msg, cause)
        self.problem = problem
                    
class SIPDirectoryNotFound(SIPDirectoryError):
    """
    An exception indicating the SIPDirectory does not exist
    """
    def __init__(self, dir, cause=None, msg=None):
        """
        :param dir  str:   the directory giving the problem
        :param cause Exception:  a caught exception that represents the 
                           underlying cause of the problem.  
        :param msg  str:   A message to override the default.
        """
        prob = "directory not found"
        super(SIPDirectoryNotFound, self).__init__(dir, prob, cause, msg)

