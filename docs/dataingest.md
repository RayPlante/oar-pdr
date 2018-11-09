## Data Ingest and Preservation

The PDR model for data ingest is based on concepts from the OASIS model for
open archives and repositories.  In the OASIS model, data are submitted to a
repository in the form of a _submission information package_, or SIP.  The
first job of the ingest process is convert the SIP into an _archive information
package_, or AIP.  An AIP is a transformation and organization of the data into
a form that the repository understands; it allows the repository system to load
the data and metadata that make up the submission into its on-line systems as
well as deliver it to long-term storage.  In general, a repository can support
different types of SIPs depending on the source of the data, and indeed the PDR
design allows for this.  Nevertheless, the SIP represents an agreement between
the repository and the submitter regarding our the submitted data is organized.
On the other hand, there is typically a single model for an AIP
supported by the repository.  For the PDR, an AIP takes the form of one or more
serialized "bags" (conforming to the BagIt data packaging standard, described
in more detail later).  

(summarizing diagram of the ingest system and flow.)

Currently, there is support for just one type of SIP implemented in the PDR:
the MIDAS SIP.  Nevertheless, the software that handles ingest attempts to make
clear distinctions between components that are general--i.e. not specific to a
particular SIP--and those that are SIP specific.

In the PDR, the Preservation Service is responsible for converting an SIP into
an AIP and then loading the AIP into the PDR system.  In particular, the bag
files that make up the AIP are sent to long-term storage, (metadata and
ancillary data are loaded into the Fedora system,) and the metadata are loaded
into the RMM's database.  The submission process begins when the files that
make up the SIP are deposited into storage accessible to the service and at a
designated location associated a particular identifier.  (How the submitter
determines the location and identifier is dependent on the type of SIP being
submitted.)  When all the pieces of the SIP have been deposited and are ready
for ingest, the submitter contacts the Preservation Service, providing a name
indicating the type of SIP it is and an identifier for the SIP.  The identifier
provides enough information for the service to locate the SIP on disk.  The
Service operates as a REST web service (see the detailed description of the
API), and when the SIP is large, the service will process the SIP
asynchronously
