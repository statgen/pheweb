from ..conf_utils import conf
import sys
import threading
from collections import defaultdict

from googleapiclient.discovery import build
from google.oauth2 import service_account

if conf["authentication"]:
    group_names = []
    # get group names from either the "GROUP"
    # attribute containing a single group name
    # (to support legacy configurations) or get
    # a list from "GROUPS"
    if "GROUP" in conf.group_auth:
        group_names.append(conf.group_auth["GROUP"])
    elif "GROUPS":
        group_names.extend(conf.group_auth["GROUPS"])

    service_account_file = conf.group_auth["SERVICE_ACCOUNT_FILE"]
    delegated_account = conf.group_auth["DELEGATED_ACCOUNT"]

    service_account_scopes = [
        "https://www.googleapis.com/auth/admin.directory.group.readonly",
        "https://www.googleapis.com/auth/admin.directory.user.readonly",
        "https://www.googleapis.com/auth/admin.directory.group.member.readonly",
    ]

    # set credentials
    creds = service_account.Credentials.from_service_account_file(
        service_account_file, scopes=service_account_scopes
    )
    delegated_creds = creds.with_subject(delegated_account)
    services = defaultdict(
        lambda: build("admin", "directory_v1", credentials=delegated_creds)
    )

    whitelist = conf.login["whitelist"] if "whitelist" in conf.login.keys() else []

else:
    group_names = []
    service_account_file = None
    delegated_account = None
    service_account_scopes = None
    creds = None
    delegated_creds = None
    services = None
    whitelist = None


def get_all_members(group_names):
    members = []
    for name in group_names:
        all = services[threading.get_ident()].members().list(groupKey=name).execute()
        memebers.extend(all["members"])
    return members


def get_member_status(username):
    allmembers = get_all_members(group_names)

    for m in allmembers:
        user = m["email"]
        if "gserviceaccount" in user:  # service accounts are excluded
            continue
        if user == username:
            return m["status"]


def verify_membership(username):

    if username in whitelist:
        return True
    # auth service .hasMember will only work for accounts of the domain
    elif not username.endswith("@finngen.fi"):
        return False
    else:
        for name in group_names:
            r = (
                services[threading.get_ident()]
                .members()
                .hasMember(groupKey=name, memberKey=username)
                .execute()
            )
            if r["isMember"] is True:
                return True
    # default to false
    return False
