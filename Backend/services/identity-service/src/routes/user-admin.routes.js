import {sendJson} from '../utils/http.js';
import {UserAdminService} from '../services/user-admin.service.js';
import {UserSupportService} from '../services/user-support.service.js';
import {UserWorkflowService} from '../services/user-workflow.service.js';
export function createUserAdminRoutes(identity,profiles,config,auth){
  const users=new UserAdminService(identity,profiles,config),support=new UserSupportService(identity),workflows=new UserWorkflowService(users);
  const guarded=(method,path,fn)=>({method,path,middleware:[auth],handler:async(req,res)=>sendJson(res,200,await fn(req))});
  const publicRoute=(method,path,fn)=>({method,path,handler:async(req,res)=>sendJson(res,200,await fn(req))});
  const query=req=>Object.fromEntries(new URL(req.url,'http://localhost').searchParams);
  const token=req=>req.headers['x-account-support-token'];
  return [
    guarded('GET',/^\/api\/v2\/admin\/users\/([0-9a-f-]{36})\/workspace$/i,req=>users.workspace(req.auth.user,req.params.id)),
    guarded('GET',/^\/api\/v2\/admin\/users\/([0-9a-f-]{36})\/impact$/i,req=>users.impact(req.auth.user,req.params.id,req.headers.authorization)),
    guarded('POST',/^\/api\/v2\/admin\/users\/([0-9a-f-]{36})\/contact$/i,req=>users.sensitive(req.auth.user,req.params.id,req.body)),
    guarded('POST','/api/v2/admin/users/contact-search',req=>users.searchContact(req.auth.user,req.body)),
    guarded('PATCH',/^\/api\/v2\/admin\/users\/([0-9a-f-]{36})\/status$/i,req=>users.moderate(req.auth.user,req.params.id,req.body)),
    guarded('GET',/^\/api\/v2\/admin\/users\/([0-9a-f-]{36})\/sessions$/i,req=>users.sessions(req.auth.user,req.params.id)),
    guarded('GET',/^\/api\/v2\/admin\/users\/([0-9a-f-]{36})\/events$/i,req=>users.events(req.auth.user,req.params.id)),
    guarded('POST',/^\/api\/v2\/admin\/users\/([0-9a-f-]{36})\/revoke-sessions$/i,req=>users.revokeSessions(req.auth.user,req.params.id,req.body)),
    guarded('POST',/^\/api\/v2\/admin\/users\/([0-9a-f-]{36})\/password-reset$/i,req=>users.resetPassword(req.auth.user,req.params.id,req.body,req.context)),
    guarded('GET',/^\/api\/v2\/admin\/users\/([0-9a-f-]{36})\/notes$/i,req=>users.notes(req.auth.user,req.params.id)),
    guarded('POST',/^\/api\/v2\/admin\/users\/([0-9a-f-]{36})\/notes$/i,req=>users.addNote(req.auth.user,req.params.id,req.body)),
    guarded('PUT',/^\/api\/v2\/admin\/users\/([0-9a-f-]{36})\/team$/i,req=>users.assignTeam(req.auth.user,req.params.id,req.body)),
    guarded('GET','/api/v2/admin/user-teams',req=>users.teams(req.auth.user)),
    ...['support','trust','privacy'].map(team=>guarded('PUT',`/api/v2/admin/user-teams/${team}`,req=>users.updateTeam(req.auth.user,team,req.body))),
    guarded('GET',/^\/api\/v2\/admin\/users\/([0-9a-f-]{36})\/signals$/i,req=>users.signals(req.auth.user,req.params.id)),
    guarded('GET','/api/v2/admin/user-workflows',req=>workflows.list(req.auth.user,query(req))),
    guarded('GET',/^\/api\/v2\/admin\/user-workflows\/([0-9a-f-]{36})$/i,req=>workflows.detail(req.auth.user,req.params.id)),
    guarded('POST',/^\/api\/v2\/admin\/user-workflows\/([0-9a-f-]{36})\/actions$/i,req=>workflows.action(req.auth.user,req.params.id,req.body,req.headers.authorization)),
    guarded('POST',/^\/api\/v2\/admin\/user-workflows\/([0-9a-f-]{36})\/artifact$/i,req=>workflows.artifact(req.auth.user,req.params.id,req.body)),
    publicRoute('POST','/api/v2/account-support/challenge',req=>support.challenge(req.body,req.context)),
    publicRoute('POST','/api/v2/account-support/verify',req=>support.verify(req.body,req.context)),
    publicRoute('GET','/api/v2/account-support/state',req=>support.state(token(req))),
    publicRoute('POST','/api/v2/account-support/cases',req=>support.create(token(req),req.body)),
    publicRoute('GET',/^\/api\/v2\/account-support\/cases\/([0-9a-f-]{36})\/artifact$/i,req=>workflows.ownArtifact(token(req),req.params.id)),
  ];
}
