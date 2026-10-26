FROM ubuntu:24.04
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends snmpd openssh-server iproute2 && rm -rf /var/lib/apt/lists/*
RUN useradd -m -s /bin/bash technician && echo 'technician:lab-only-password' | chpasswd && mkdir -p /run/sshd
COPY snmpd.conf /etc/snmp/snmpd.conf
EXPOSE 22/tcp 161/udp
CMD service ssh start && exec /usr/sbin/snmpd -f -Lo -C -c /etc/snmp/snmpd.conf
