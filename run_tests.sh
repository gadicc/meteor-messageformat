#!/bin/bash

echo "Testing on Meteor >= 0.9.0 (1/2)"
echo "--------------------------------"
echo

cd laika

echo "Test disabled until laika#140 is fixed..."
echo
echo

#if [ -n "$LAIKA_OPTIONS" ] ; then
#	laika $LAIKA_OPTIONS
#else
#	laika -V -t 5000 $@
#fi


echo "Testing on Meteor <= 0.8.3 (2/2)"
echo "--------------------------------"
echo

cd ../laika-0.8.3

if [ -n "$LAIKA_OPTIONS" ] ; then
	laika $LAIKA_OPTIONS
else
	laika -V -t 5000 $@
fi

