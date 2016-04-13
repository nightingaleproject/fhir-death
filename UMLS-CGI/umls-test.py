import requests
from umls import *

u = UMLS("rhoffman12","!WangLab2016")

print "tgt: "+u.tgt

print u.cui_search_by_code("386.11","ICD9CM")
print u.code_search_by_cui("C0155502","ICD10,ICD10CM,ICD9CM")

