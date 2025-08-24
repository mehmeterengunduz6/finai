import * as fs from 'fs';
import * as path from 'path';

// Simple storage system without vector database for initial testing
const SIMPLE_STORAGE_DIR = process.env.PROCESSED_DIR || './processed';
const EMBEDDINGS_DIR = path.join(SIMPLE_STORAGE_DIR, 'embeddings');

// Create directories
if (!fs.existsSync(EMBEDDINGS_DIR)) {
    fs.mkdirSync(EMBEDDINGS_DIR, { recursive: true });
}

export interface SimpleEmbedding {
    id: string;
    content: string;
    company: string;
    filename: string;
    metadata: any;
}

export class SimpleStorageService {
    
    /**
     * Store embeddings without vector database
     */
    static async storeEmbeddings(embeddings: SimpleEmbedding[]): Promise<void> {
        try {
            for (const embedding of embeddings) {
                const filename = `${embedding.id}.json`;
                const filepath = path.join(EMBEDDINGS_DIR, filename);
                
                fs.writeFileSync(filepath, JSON.stringify(embedding, null, 2));
            }
            
            console.log(`Stored ${embeddings.length} embeddings`);
        } catch (error) {
            console.error('Failed to store embeddings:', error);
            throw error;
        }
    }
    
    /**
     * Simple keyword-based search (fallback)
     */
    static async searchContent(query: string, company?: string): Promise<SimpleEmbedding[]> {
        try {
            const files = fs.readdirSync(EMBEDDINGS_DIR);
            const results: SimpleEmbedding[] = [];
            
            const queryWords = query.toLowerCase().split(/\s+/);
            
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                
                try {
                    const filepath = path.join(EMBEDDINGS_DIR, file);
                    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
                    
                    // Filter by company if specified
                    if (company && data.company !== company) continue;
                    
                    // Simple keyword matching
                    const content = data.content.toLowerCase();
                    let score = 0;
                    
                    for (const word of queryWords) {
                        if (content.includes(word)) {
                            score += 1;
                        }
                    }
                    
                    if (score > 0) {
                        results.push({ ...data, score });
                    }
                    
                } catch (error) {
                    console.warn(`Failed to read embedding file ${file}:`, error);
                }
            }
            
            // Sort by score (descending)
            return results.sort((a: any, b: any) => (b.score || 0) - (a.score || 0)).slice(0, 10);
            
        } catch (error) {
            console.error('Search failed:', error);
            return [];
        }
    }
    
    /**
     * Get count of stored embeddings
     */
    static getEmbeddingCount(): number {
        try {
            const files = fs.readdirSync(EMBEDDINGS_DIR);
            return files.filter(f => f.endsWith('.json')).length;
        } catch (error) {
            return 0;
        }
    }
    
    /**
     * Clear all embeddings
     */
    static clearAllEmbeddings(): void {
        try {
            const files = fs.readdirSync(EMBEDDINGS_DIR);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    fs.unlinkSync(path.join(EMBEDDINGS_DIR, file));
                }
            }
            console.log('Cleared all embeddings');
        } catch (error) {
            console.error('Failed to clear embeddings:', error);
        }
    }
}

// Singleton instance
export const simpleStorage = new SimpleStorageService();