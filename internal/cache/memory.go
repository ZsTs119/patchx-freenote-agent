package cache

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"
)

const (
	defaultSearchLimit = 20
	maxSearchLimit     = 50
)

type Memory struct {
	ID                 string    `json:"id"`
	Platform           string    `json:"platform"`
	Source             string    `json:"source,omitempty"`
	RequestID          string    `json:"request_id,omitempty"`
	TaskType           string    `json:"task_type,omitempty"`
	Title              string    `json:"title,omitempty"`
	Summary            string    `json:"summary,omitempty"`
	ObjectType         string    `json:"object_type"`
	ClientObjectID     string    `json:"client_object_id"`
	RevisionID         string    `json:"revision_id"`
	SchemaID           string    `json:"schema_id"`
	SourceAvailability string    `json:"source_availability"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type MemoryStore interface {
	ListMemories(ctx context.Context, platform string) ([]Memory, error)
}

type MemorySearchParams struct {
	Platform string
	Query    string
	Limit    int
}

type MemorySearchResult struct {
	Items []Memory `json:"items"`
}

type MemoryIndex struct {
	mu        sync.Mutex
	memories  map[string]Memory
	accountID string
}

func NewMemoryIndex() *MemoryIndex {
	return &MemoryIndex{
		memories: make(map[string]Memory),
	}
}

// BindAccount retains loaded content across token rotation, but clears it when
// the authenticated account changes or the session is cleared.
func (i *MemoryIndex) BindAccount(accountID string) {
	i.mu.Lock()
	defer i.mu.Unlock()
	if i.accountID != accountID {
		i.memories = make(map[string]Memory)
		i.accountID = accountID
	}
}

func (i *MemoryIndex) UpsertMemories(ctx context.Context, memories []Memory) error {
	i.mu.Lock()
	defer i.mu.Unlock()

	for _, memory := range memories {
		if memory.ID == "" || memory.Platform == "" {
			continue
		}
		i.memories[memory.Platform+"\x00"+memory.ID] = memory
	}
	return nil
}

func (i *MemoryIndex) ListMemories(ctx context.Context, platform string) ([]Memory, error) {
	i.mu.Lock()
	defer i.mu.Unlock()

	var memories []Memory
	for _, memory := range i.memories {
		if platform == "" || memory.Platform == platform {
			memories = append(memories, memory)
		}
	}
	return memories, nil
}

func SearchMemories(ctx context.Context, store MemoryStore, params MemorySearchParams) (MemorySearchResult, error) {
	if store == nil {
		return MemorySearchResult{}, fmt.Errorf("memory cache store is required")
	}
	if params.Platform != "" && params.Platform != "mobile" && params.Platform != "desktop" && params.Platform != "web" {
		return MemorySearchResult{}, fmt.Errorf("platform must be mobile, desktop, or web when set")
	}
	query := strings.ToLower(strings.TrimSpace(params.Query))
	if query == "" {
		return MemorySearchResult{}, fmt.Errorf("query is required")
	}
	limit := params.Limit
	if limit <= 0 {
		limit = defaultSearchLimit
	}
	if limit > maxSearchLimit {
		limit = maxSearchLimit
	}

	memories, err := store.ListMemories(ctx, params.Platform)
	if err != nil {
		return MemorySearchResult{}, err
	}

	result := MemorySearchResult{
		Items: make([]Memory, 0, min(limit, len(memories))),
	}
	for _, memory := range memories {
		if params.Platform != "" && memory.Platform != params.Platform {
			continue
		}
		if !memoryMatches(memory, query) {
			continue
		}
		result.Items = append(result.Items, memory)
		if len(result.Items) >= limit {
			break
		}
	}

	return result, nil
}

func memoryMatches(memory Memory, query string) bool {
	fields := []string{
		memory.ID,
		memory.Source,
		memory.RequestID,
		memory.TaskType,
		memory.Title,
		memory.Summary,
		memory.ObjectType,
		memory.ClientObjectID,
		memory.RevisionID,
		memory.SchemaID,
		memory.SourceAvailability,
	}
	for _, field := range fields {
		if strings.Contains(strings.ToLower(field), query) {
			return true
		}
	}
	return false
}
