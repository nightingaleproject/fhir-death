# # #
# 
# umls.py
#   Ryan Hoffman, 2016
#
#   Requires Requests
# 
# # #

import requests
import json

class UMLS:
  """ UMLS session class """
  # some segments from https://github.com/HHS/uts-rest-api
  
  restbase = "https://uts-ws.nlm.nih.gov/rest"
  authbase = "https://utslogin.nlm.nih.gov"
  
  def __init__(self, username, password):
    
    self.username = username
    self.password = password
    self.update_tgt()
  
  def update_tgt(self):
    
    params = {'username': self.username,
              'password': self.password}
    h = {"Content-type": "application/x-www-form-urlencoded", 
         "Accept": "text/plain", 
         "User-Agent": "python" }
    r = requests.post(self.authbase+"/cas/v1/tickets/", data=params, headers=h)
    ndx1 = r.text.find("TGT-")
    ndx2 = r.text.find('"',ndx1)
    tgt = r.text[ndx1:ndx2]
    
    self.tgt = tgt
  
  def service_ticket(self):
    
    params = {'service': "http://umlsks.nlm.nih.gov"}
    h = {"Content-type": "application/x-www-form-urlencoded", 
         "Accept": "text/plain", 
         "User-Agent": "python" }
    r = requests.post(self.authbase+"/cas/v1/tickets/"+self.tgt, data=params, headers=h)
    return r.text
  
  def cui_search_by_code(self, code, system=[]):
    
    params = {'string'    : code,
              'searchType': "exact",
              'inputType' : "code",
              'ticket'    : self.service_ticket() }
    if len(system)>0:
      params['sabs'] = system
    url = self.restbase+"/search/current?"
    for key in params.iterkeys():
      url += key + "=" + params[key] + "&"
    #print url[:-1]
    
    h = {"Accept": "application/json", 
         "User-Agent": "python" }
    
    r = requests.get(url[:-1], headers=h)
    res = json.loads(r.text)
    
    return res['result']['results'][0]['ui']
  
  def code_search_by_cui(self, cui, system):
    
    url = self.restbase + "/content/current/CUI/" + cui
    url += "/atoms?sabs=" + system # + "&ttys=PT,SY"
    url += "&ticket=" + self.service_ticket()
    #print url
    
    h = {"Accept": "application/json", 
         "User-Agent": "python" }
    
    try:
      r = requests.get(url, headers=h)
      res = json.loads(r.text)
      return res['result'][0]['code'].rsplit('/',1)[-1]
    except:
      raise UMLSNoMatchingCodesException("code_search_by_cui")
  
class UMLSNoMatchingCodesException(Exception):
  pass


    
  
  
  
  
  
  
  