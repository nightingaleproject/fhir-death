#!/usr/bin/python

#
# fsm_match.py
#   Hang, 2016
#
#
# implemts a function that can read the rules from file
# and then match a person's condtions, suggest rules
# Example Usage
# python fsm_match.py data="['I25', 'I46', 'G30']"

import cgi
import cgitb

import sys
import json

import itertools
from collections import OrderedDict
import cPickle as pickle
import ast

def brute_match(fsqs, conditions):
    '''
    INPUT:
        fsqs: dictionary of rules we have, (tuple, int)
                the tuple is a list of sequence, e.g., ('I45', 'I56')
                the int is the corresponding count of this tuple

        conditions: list of condtions a patient can have
    OUTPUT:
        res: a list of (string,int) that we suggested
                the string is the join of all the conditions
    '''
    res = {}
    for r in xrange(2, len(conditions)+1):
        # print r
        r_subseq = itertools.combinations(conditions, r)
        for ele in r_subseq:
            if ele in fsqs:
                res['->'.join(ele)] = fsqs[ele]
    res = sorted(res.items(), key = lambda x: x[1],reverse = True)
    return res


cgitb.enable() # pretty tracebacks for cgi scripts

### Response headers (done first, so that ACAO is on any cgitb traceback)

print "Content-Type: application/json"
print "Access-Control-Allow-Origin: *" # CORS
print #newline

### Read raw data from stdin

form = cgi.FieldStorage()

conditions = form.getfirst("conditions")
# conditions = ast.literal_eval(raw)
# conditions = json.loads(raw)

### Get the files
f = open('./mort2012_o_seqs_50_3codes.p','rb')
o_seqs = pickle.load(f)
f.close()

### The match functions we are using, see comments above
p = brute_match(o_seqs, conditions)

# print p
results = {}
results['res'] = p
### Dump the HTTP response body

print json.dumps(results)

























