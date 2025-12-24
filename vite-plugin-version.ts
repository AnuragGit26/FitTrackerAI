import { Plugin } from 'vite';
import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

interface VersionInfo {
    version: string;
    timestamp: number;
    buildDate: string;
    gitCommit?: string;
}

export function versionPlugin(): Plugin {
  return {
    name: 'version-plugin',
    apply: 'build',
    writeBundle(options) {
            const outDir = options.dir || 'dist';
            const timestamp = Date.now();
            const buildDate = new Date().toISOString();

            let gitCommit: string | undefined;

            // Try to get git commit hash
            try {
                // Check for Vercel's environment variable first
                if (process.env.VERCEL_GIT_COMMIT_SHA) {
                    gitCommit = process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7);
                } else {
                    // Fallback to local git
                    gitCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
                }
            } catch (error) {
                // Git not available or not in a git repo
                console.warn('[version-plugin] Could not get git commit hash, using timestamp only');
            }

            // Generate version string: timestamp-gitCommit or just timestamp
            const version = gitCommit ? `${timestamp}-${gitCommit}` : `${timestamp}`;

            const versionInfo: VersionInfo = {
                version,
                timestamp,
                buildDate,
                ...(gitCommit && { gitCommit }),
            };

      // Write version.json to dist directory
      const versionPath = join(outDir, 'version.json');
      writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2), 'utf-8');
      
      // eslint-disable-next-line no-console
      console.log(`[version-plugin] Generated version.json: ${version}`);
        },
    };
}

