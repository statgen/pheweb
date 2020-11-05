from ..conf_utils import conf
import sys
import threading
from collections import defaultdict

from googleapiclient.discovery import build
from google.oauth2 import service_account

if conf["authentication"]:
    group_name = conf.group_auth['GROUP']
    service_account_file = conf.group_auth['SERVICE_ACCOUNT_FILE']
    delegated_account = conf.group_auth['DELEGATED_ACCOUNT']

    service_account_scopes = [
        'https://www.googleapis.com/auth/admin.directory.group.readonly',
        'https://www.googleapis.com/auth/admin.directory.user.readonly',
        'https://www.googleapis.com/auth/admin.directory.group.member.readonly'
    ]

    # set credentials
    creds = service_account.Credentials.from_service_account_file(service_account_file, scopes=service_account_scopes)
    delegated_creds = creds.with_subject(delegated_account)
    services = defaultdict( lambda: build('admin', 'directory_v1', credentials=delegated_creds) )

    whitelist = conf.login['whitelist'] if 'whitelist' in conf.login.keys() else []

else:
    group_name = None
    service_account_file = None
    delegated_account = None
    service_account_scopes = None
    creds = None
    delegated_creds = None
    services = None
    whitelist = None

def get_all_members(group_name):
    all = services[threading.get_ident()].members().list(groupKey=group_name).execute()
    allmembers = all['members']
    return allmembers


def get_member_status(username):
    allmembers = get_all_members(group_name)

    for m in allmembers:
        user = m['email']
        if "gserviceaccount" in user:  # service accounts are excluded
            continue
        if user == username:
            return m['status']



def verify_membership(username):

    if username in whitelist:
        return True

    # auth service .hasMember will only work for accounts of the domain
    if not username.endswith('@finngen.fi'):
        return False

    r = services[threading.get_ident()].members().hasMember(groupKey=group_name, memberKey=username).execute()

    return r['isMember']

    ## Members are grouped to one so don't check for individual member status
    # status = get_member_status(username)
    # if status == 'ACTIVE':
    #     #print('\n\n' + username + ' is a member of ' + group_name + ' with status = ' + status)  # user is an ACTIVE member
    #     return True
    # else:
    #     #print('\n\n' + username + ' is a member of ' + group_name + ' with status = ' + status)  # user is a SUSPENDED member
    #     return False
