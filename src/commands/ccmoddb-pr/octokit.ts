// Copyright (C) 2019-2024 CCDirectLink members
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { Octokit } from '@octokit/rest'

let owner: string
let repo: string
let octokit: Octokit | undefined

export class OctokitUtil {
    static isInited(): boolean {
        return !!octokit
    }

    static initOctokit(token: string, owner: string, repo: string) {
        octokit = new Octokit({ auth: token })
        owner = owner
        repo = repo
    }

    static async getBranchList(): Promise<string[]> {
        const res = await octokit!.repos.listBranches({
            owner,
            repo,
        })
        return res.data.map(branch => branch.name)
    }

    static async createBranch(baseBranch: string, newBranch: string) {
        try {
            const { data: baseBranchData } = await octokit!.request('GET /repos/{owner}/{repo}/git/refs/heads/{branch}', { owner, repo, branch: baseBranch })
            const baseBranchSha = baseBranchData.object.sha

            await octokit!.request('POST /repos/{owner}/{repo}/git/refs', {
                owner,
                repo,
                ref: `refs/heads/${newBranch}`,
                sha: baseBranchSha,
            })
        } catch (error: any) {
            console.error(`Error creating branch: ${error.message}`)
            throw error
        }
    }

    static async fetchFile(branch: string, filePath: string): Promise<string> {
        try {
            const res = (await octokit!.repos.getContent({ owner, repo, path: filePath, ref: branch })) as any
            return Buffer.from(res.data.content, 'base64').toString()
        } catch (error: any) {
            console.error(`Error fetching file: ${error.message}`)
            throw error
        }
    }

    static async commitFile(branch: string, filePath: string, content: string, message: string) {
        const {
            data: { sha },
        } = (await octokit!.repos.getContent({ owner, repo, path: filePath, ref: branch })) as any

        const newContent = Buffer.from(content).toString('base64')
        await octokit!.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner,
            repo,
            path: filePath,
            message,
            content: newContent,
            sha,
            branch,
        })
    }

    static async createPullRequest(baseBranch: string, newBranch: string, title: string, body: string) {
        try {
            const res = await octokit!.request('POST /repos/{owner}/{repo}/pulls', { owner, repo, title, body, head: newBranch, base: baseBranch })
            const url: string = res.data._links.html.href
            return url
        } catch (error: any) {
            console.error(`Error creating pull request: ${error.message}`)
            throw error
        }
    }
}
