#!/usr/bin/python

# 
# umls-icd10.py
#   Ryan Hoffman, 2016
# 
#  CGI script for using UMLS API to crosswalk codes
#  to ICD-10 for public health reporting apps.
#

import cgi
import cgitb

import sys
import json

from umls import *

cgitb.enable() # pretty tracebacks for cgi scripts

### Response headers (done first, so that ACAO is on any cgitb traceback)

print "Content-Type: application/json"
print "Access-Control-Allow-Origin: *" # CORS
print #newline

### Read raw data from stdin

form = cgi.FieldStorage()

user = form.getfirst("username")
passwd = form.getfirst("password")
raw = form.getfirst("data")

bundle = json.loads(raw)
bundle['type'] = "batch-response"

#print json.dumps(bundle)
#sys.exit()

### Establish UMLS metathesaurus session

mt = UMLS(user,passwd)

### Iterate over conditions, adding new codes

for i, e in enumerate(bundle["entry"]):
  if "resource" in e and "code" in e["resource"] and \
      "coding" in e["resource"]["code"]:
    cui = mt.cui_search_by_code(e["resource"]["code"]["coding"][0]["code"])
    try:
      code = mt.code_search_by_cui(cui,"ICD10,ICD10CM,ICD10PCS")
      newcode = {"code": code, "system": "ICD10"}
      bundle["entry"][i]["resource"]["code"]["coding"].append(newcode)
    except UMLSNoMatchingCodesException:
      sys.stderr.write("UMLSNoMatchingCodesException: no match for " + 
                       e["resource"]["code"]["coding"][0]["code"])

### Dump the HTTP response body

print json.dumps(bundle)

























