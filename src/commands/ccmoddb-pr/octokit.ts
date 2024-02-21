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

export class OctokitUtil {
    static octokit: Octokit | undefined
    static owner: string
    static repo: string

    static isInited(): boolean {
        return !!this.octokit
    }

    static initOctokit(token: string, owner: string, repo: string) {
        this.octokit = new Octokit({ auth: token })
        this.owner = owner
        this.repo = repo
    }

    static async getBranchList(): Promise<string[]> {
        const res = await this.octokit!.repos.listBranches({
            owner: this.owner,
            repo: this.repo,
        })
        return res.data.map(branch => branch.name)
    }

    static async createBranch(baseBranch: string, newBranch: string) {
        try {
            const { data: baseBranchData } = await this.octokit!.request('GET /repos/{owner}/{repo}/git/refs/heads/{branch}', {
                owner: this.owner,
                repo: this.repo,
                branch: baseBranch,
            })
            const baseBranchSha = baseBranchData.object.sha

            await this.octokit!.request('POST /repos/{owner}/{repo}/git/refs', {
                owner: this.owner,
                repo: this.repo,
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
            const res = (await this.octokit!.repos.getContent({ owner: this.owner, repo: this.repo, path: filePath, ref: branch })) as any
            return Buffer.from(res.data.content, 'base64').toString()
        } catch (error: any) {
            console.error(`Error fetching file: ${error.message}`)
            throw error
        }
    }

    static async commitFile(branch: string, filePath: string, content: string, message: string) {
        const {
            data: { sha },
        } = (await this.octokit!.repos.getContent({ owner: this.owner, repo: this.repo, path: filePath, ref: branch })) as any

        const newContent = Buffer.from(content).toString('base64')
        await this.octokit!.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner: this.owner,
            repo: this.repo,
            path: filePath,
            message,
            content: newContent,
            sha,
            branch,
        })
    }

    static async createPullRequest(baseBranch: string, newBranch: string, title: string, body: string) {
        try {
            const res = await this.octokit!.request('POST /repos/{owner}/{repo}/pulls', {
                owner: this.owner,
                repo: this.repo,
                title,
                body,
                head: newBranch,
                base: baseBranch,
            })
            const url: string = res.data._links.html.href
            return url
        } catch (error: any) {
            console.error(`Error creating pull request: ${error.message}`)
            throw error
        }
    }
}
