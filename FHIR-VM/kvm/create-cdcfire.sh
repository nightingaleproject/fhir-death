#!/bin/bash
#
#  fhir-death project VM
#  This is how the KVM guest was originally created


virt-install                                                  \
  --hvm                                                       \
  --name=cdcfire                                              \
  --vcpus=2                                                   \
  --ram=2048                                                  \
  --network bridge:br0                                        \
  --location /data/kvm/CentOS-6.7-x86_64-netinstall.iso       \
  --disk path=/data/kvm/cdcfire.img                           \
  --disk path=/data/kvm/CentOS-6.7-x86_64-minimal.iso         \
  --extra-args="console=tty0 console=ttyS0,115200n8 edd=off"


# After installation, log in using the virsh console and start the netowork
#
#   ifup eth0
#
# Make this automatic by: 
#
#   nano /etc/sysconfig/network-scripts/ifcfg-eth0
#   # edit ONBOOT=yes
#


