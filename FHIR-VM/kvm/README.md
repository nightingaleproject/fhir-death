MIBLab FHIR Server VM
=====================

Background and Setup
--------------------

The lab FHIR server is a KVM virtual machine set up using 
libvirt for runnung on the lab servers.

Make sure that your server is ready to run these VMs using 
your package manager (yum, apt-get) to install libvirt-bin.


Recreating the VM
-----------------

You can regenerate a version of the virtual machine using 
the `create-cdcfire.sh` script. This install is designed 
with CentOS 6.x in mind - if ISOs are not readily available,
they can be quickly downloaded from the GT Library CentOS
mirror.


Moving / Reinitializing the VM
------------------------------

If it's ever necessary to move the VM off of apollo and on 
to a different lab server, only two files are needed from  
apollo or from this repository:

1. `miblab-fhir.img`: the disk image for the VM
2. `miblab-fhir.xml`: the config file

Modify the XML file as necessary to point to the path of 
the disk image on the new host. On the host machine, log 
in as root and run the following commands:

    virsh create miblab-fhir.xml
    virsh console miblab-fhir
    
Verify that the machine boots correctly. When you are ready 
to disconnect from the guest, use `^]` to detach from the 
virtualized console.
