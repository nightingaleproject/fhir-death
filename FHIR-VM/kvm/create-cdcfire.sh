#!/bin/bash
#
#  fhir-death project VM
#  This is how the KVM guest was originally created
#  Run as root


# # #
#
#  Install
#
# # #

DISK=/data/kvm/miblab-fhir.img

fallocate -l 100G $DISK
chown qemu:qemu $DISK
chmod 0744 $DISK
virt-install                                  \
  --hvm                                       \
  --name=miblab-fhir                          \
  --vcpus=2                                   \
  --ram=2048                                  \
  --network bridge:br0,mac=52:54:00:1f:23:8b  \
  --disk path=$DISK                           \
  --cdrom=ISOs/ubuntu-14.04.4-server-amd64.iso         
# # http://serverfault.com/questions/226429/how-do-i-headless-install-ubuntu-10-10-server
# # at the "boot" prompt, enter:
# /install/vmlinuz console=ttyS0,115200n8 file=/cdrom/preseed/ubuntu-server.seed initrd=/install/initrd.gz

# # #
#
#  Final Setup
#
# # #


# After installation, log in using the virsh console and start the network
#
#   ifup eth0
#
# Make this automatic by: 
#
#   nano /etc/sysconfig/network-scripts/ifcfg-eth0
#   # edit ONBOOT=yes
#


