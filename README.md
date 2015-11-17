# fhir-death

Downloading Submodules for Reference
------------------------------------

There are two submodules to this project: the SMART-on-FHIR client-py repository, and GT i3L's GT-FHIR server. If you need access to either of these repositories for reference, you will need to download the submodules.

    i3L/GT-FHIR: https://github.com/i3l/GT-FHIR
    SMART-on-FHIR/client-py: https://github.com/smart-on-fhir/client-py

After checking out this repository without the --recursive flag you will have empty subdirectories where the submodules should be. Run these commands to download the two repos.

    git submodule init
    git submodule update
