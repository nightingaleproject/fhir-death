# FHIR For Death Reporting

This repository contains all files related to the GT/CDC collaboration using FHIR applications for death reporting. It also contains the configurations files used to create the lab's SMART-onFHIR apps server.

Branches
--------

- `master`: SMART-on-FHIR app development
- `no-auth`: app connecting to FHIR server with no autentication (non-SMART)
- `deploy`: minimal repository, for SMART-on-FHIR app deployment only


Downloading Submodules for Reference
------------------------------------

A few relevant repositories have been added to this repo as submodules for reference or modification if needed. To download these optional repositories, clone this repo then run the commands below:

    git submodule init
    git submodule update
