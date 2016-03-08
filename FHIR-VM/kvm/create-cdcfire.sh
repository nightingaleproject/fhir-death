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

fallocate -l 20G $DISK
chown qemu:qemu $DISK
chmod 0744 $DISK
virt-install                                  \
  --hvm                                       \
  --name=miblab-fhir                          \
  --vcpus=2                                   \
  --ram=2048                                  \
  --network bridge:br0,mac=52:54:00:1f:23:8b  \
  --disk path=$DISK                           \
  --cdrom=ubuntu-14.04.4-server-amd64.iso         


# # #
#
#  Final Setup
#
# # #


# After installation, log in using the virsh console and start the netowork
#
#   ifup eth0
#
# Make this automatic by: 
#
#   nano /etc/sysconfig/network-scripts/ifcfg-eth0
#   # edit ONBOOT=yes
#


