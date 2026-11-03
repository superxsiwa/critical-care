package auth

import (
	"strings"
	"sync"
	"time"
)

// Sign-in throttling, within FailureWindow: MaxPairFailures wrong passwords for one username from one
// address (the one a person meets), MaxUserFailures for one username from anywhere, MaxIPFailures from
// one address. Keyed on the address too, so a stranger's guesses cannot lock a person out of their own
// account; the wider limits still stop guesses spread over many addresses or many usernames.
//
// An attempt is TAKEN before the password is checked, so guesses sent together cannot all pass a count
// nobody had raised yet. A success gives its attempt back and clears the pair. In memory: one process
// serves the data folder, and a restart forgetting the counts is acceptable.
const (
	MaxPairFailures = 5
	MaxUserFailures = 50
	MaxIPFailures   = 30
	FailureWindow   = 15 * time.Minute
)

func limitOf(key string) int {
	switch {
	case strings.HasPrefix(key, "ip:"):
		return MaxIPFailures
	case strings.HasPrefix(key, "pair:"), strings.HasPrefix(key, "own:"):
		return MaxPairFailures
	}
	return MaxUserFailures
}

type bucket struct {
	first time.Time
	count int
}

type throttle struct {
	mu  sync.Mutex
	m   map[string]*bucket
	now func() time.Time
}

func newThrottle() *throttle { return &throttle{m: map[string]*bucket{}, now: time.Now} }

func norm(username string) string { return strings.ToLower(strings.TrimSpace(username)) }

func userKey(username string) string     { return "u:" + norm(username) }
func ipKey(ip string) string             { return "ip:" + ip }
func pairKey(username, ip string) string { return "pair:" + norm(username) + "|" + ip }
func ownKey(username string) string      { return "own:" + norm(username) }

// take reserves one attempt on every key, or, when any is at its limit, says how long to wait and
// reserves none.
func (t *throttle) take(keys ...string) time.Duration {
	t.mu.Lock()
	defer t.mu.Unlock()
	now := t.now()
	var wait time.Duration
	for _, k := range keys {
		b := t.m[k]
		if b != nil && now.Sub(b.first) >= FailureWindow {
			delete(t.m, k)
			b = nil
		}
		if b != nil && b.count >= limitOf(k) {
			if w := b.first.Add(FailureWindow).Sub(now); w > wait {
				wait = w
			}
		}
	}
	if wait > 0 {
		return wait
	}
	for _, k := range keys {
		if b := t.m[k]; b != nil {
			b.count++
		} else {
			t.m[k] = &bucket{first: now, count: 1}
		}
	}
	return 0
}

// giveBack returns the attempt a success took, and forgets the keys in clear entirely.
func (t *throttle) giveBack(keys []string, clear ...string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	for _, k := range keys {
		if b := t.m[k]; b != nil && b.count > 0 {
			b.count--
		}
	}
	for _, k := range clear {
		delete(t.m, k)
	}
}
