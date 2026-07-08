#!/usr/bin/perl
use strict;
use warnings;

# Leer archivos Base64
my $logo = do { open my $fh, '<', 'assets/logo_b64_single.txt' or die $!; local $/; <$fh> };
my $consultorio = do { open my $fh, '<', 'assets/consultorio_b64.txt' or die $!; local $/; <$fh> };
my $helix = do { open my $fh, '<', 'assets/helix_b64.txt' or die $!; local $/; <$fh> };

# Leer HTML original
my $html = do { open my $fh, '<', 'igea_intranet_con_drive.html' or die $!; local $/; <$fh> };

# Reemplazar URLs con data URIs
$html =~ s|\./assets/Logo\.jpg|data:image/jpeg;base64,$logo|g;
$html =~ s|\./assets/consultorio\.jpg|data:image/jpeg;base64,$consultorio|g;
$html =~ s|\./assets/Hélice\ ADN\.mp4|data:video/mp4;base64,$helix|g;

# Escribir archivo consolidado
open my $out, '>', 'igea_intranet_standalone.html' or die $!;
print $out $html;
close $out;

print "Archivo consolidado creado: igea_intranet_standalone.html\n";
system('ls -lh igea_intranet_standalone.html');
