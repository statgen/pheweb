import sys
sys.path.append('/mnt/nfs/pheweb/')

from google_group_auth import group_auth
from googleapiclient.discovery import build
from google.oauth2 import service_account

group_name = group_auth['GROUP']
service_account_file = group_auth['SERVICE_ACCOUNT_FILE']
delegated_account = group_auth['DELEGATED_ACCOUNT']

service_account_scopes = [
    'https://www.googleapis.com/auth/admin.directory.group.readonly',
    'https://www.googleapis.com/auth/admin.directory.user.readonly',
    'https://www.googleapis.com/auth/admin.directory.group.member.readonly'
]

# set credentials
creds = service_account.Credentials.from_service_account_file(service_account_file, scopes=service_account_scopes)
delegated_creds = creds.with_subject(delegated_account)
service = build('admin', 'directory_v1', credentials=delegated_creds)

def get_all_members(group_name):
    all = service.members().list(groupKey=group_name).execute()
    allmembers = all['members']
    #print(allmembers)
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
    r = service.members().hasMember(groupKey=group_name, memberKey=username).execute()

    if not r['isMember']:
        #print('\n\n' + username + ' is NOT a member of ' + group_name)  # user is not a member
        return False

    # at this point, user has been confirmed to be a member ... now, let's check whether the user is still active in the system
    status = get_member_status(username)

    if status == 'ACTIVE':
        #print('\n\n' + username + ' is a member of ' + group_name + ' with status = ' + status)  # user is an ACTIVE member
        return True
    else:
        #print('\n\n' + username + ' is a member of ' + group_name + ' with status = ' + status)  # user is a SUSPENDED member
        return False



if __name__ == '__main__':
    result = verify_membership(username)
    print(result)
