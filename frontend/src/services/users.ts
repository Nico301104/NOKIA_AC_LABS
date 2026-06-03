import api from './api'

// Un membru al echipei, întors de GET /users/my-team.
export interface TeamUser {
  FullName: string
  Email: string | null
  Team: string | null
  IsTeamAdmin: boolean | number
}

export interface MyTeamResponse {
  team: string
  users: TeamUser[]
}

// Colegii din echipa userului curent (inclusiv el însuși), cu flag de admin.
export function getMyTeam() {
  return api.get<MyTeamResponse>('/users/my-team')
}
