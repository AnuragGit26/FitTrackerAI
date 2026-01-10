/**
 * Sound Service
 * Manages sound effect playback with volume control and user preferences
 */

class SoundService {
  private sounds = new Map<string, HTMLAudioElement>();
  private isEnabled = true;
  private globalVolume = 0.5; // 50% default volume

  /**
   * Preload a sound file
   */
  preload(name: string, url: string): void {
    try {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.volume = this.globalVolume;
      this.sounds.set(name, audio);
    } catch (error) {
      console.warn(`[SoundService] Failed to preload sound: ${name}`, error);
    }
  }

  /**
   * Play a sound by name
   */
  async play(name: string, volume?: number): Promise<void> {
    if (!this.isEnabled) return;

    const sound = this.sounds.get(name);
    if (!sound) {
      console.warn(`[SoundService] Sound not found: ${name}`);
      return;
    }

    try {
      // Reset to start if already playing
      sound.currentTime = 0;

      // Set volume (use provided or global)
      sound.volume = volume !== undefined ? volume : this.globalVolume;

      // Play the sound
      await sound.play();
    } catch (error) {
      // Silently handle errors (e.g., autoplay restrictions)
      // Error intentionally ignored for user experience
    }
  }

  /**
   * Enable or disable all sounds
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if sounds are enabled
   */
  getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Set global volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.globalVolume = Math.max(0, Math.min(1, volume));

    // Update volume for all preloaded sounds
    this.sounds.forEach(sound => {
      sound.volume = this.globalVolume;
    });
  }

  /**
   * Get global volume
   */
  getVolume(): number {
    return this.globalVolume;
  }

  /**
   * Stop a playing sound
   */
  stop(name: string): void {
    const sound = this.sounds.get(name);
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
    }
  }

  /**
   * Stop all playing sounds
   */
  stopAll(): void {
    this.sounds.forEach(sound => {
      sound.pause();
      sound.currentTime = 0;
    });
  }

  /**
   * Remove a sound from memory
   */
  unload(name: string): void {
    const sound = this.sounds.get(name);
    if (sound) {
      sound.pause();
      sound.src = '';
      this.sounds.delete(name);
    }
  }

  /**
   * Clear all sounds from memory
   */
  clear(): void {
    this.sounds.forEach((sound, name) => {
      this.unload(name);
    });
  }
}

// Singleton instance
export const soundService = new SoundService();

// Preload celebration sounds (using data URIs for small sounds)
// Success chime - short, pleasant tone
const successChimeDataUri = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAhYqPk5ibnqGkp6qtr7KztLW2t7i4uLi4t7e2tbSysK6rqKWin56ZlZGMh4J+eXRwbGdjX1xZVlNQTUpIRkRCQD8+PDw7Ojk4ODc3Njc3Nzg4OTk6Ozw9P0BCREZJTFFUWFxgZGhsb3N3e3+DiIyRlZmanqKlqaywsrS2uLq7vL2+vr6+vr28u7m4trSysa6rqKWin52ZlZGNiISAe3dwbGhlYV5bWFVST0xKR0VDQkA/PT06OTg3NjU1NDU0NTU2Njc4OTo7PD5AQkVHSk1QU1dbaGxwdHh8gISJjZGVmZ2ho6artLa4urzdv8DBwsPDxMXFxsbHx8fIyMjIx8fHxsbFxMPCwL++vLq4trSyr6yop6ShnpqXk46KhoF9eHRwbGZjX1xZVlNQTUpHREJAPz07OTc2NTQzMzIyMjIyMzM0NDU2Nzg6PD5AQkVHSkxPUlVYW15hZGdqbXBzdnl8f4KFiIuOkZSXmpueoaOpq62vsLGys7O0tLS0s7KysbCvrauqp6WinpuYlJGNiYV/e3dwbGhnY19bWFVST0xJRkRBPz06ODY0MzEwLy4tLS0tLS4uLy8wMTIzNTY4OTw+QENFSEpNUFJVWFteYWRna210dnh7foGEh4qNkJOWmZyfo6aqrK6wsrO0tbW2t7e3t7e2trW1s7KwrqyqqKajop+dmpaTkI2JhoJ+enh0cGxpZWJfW1hVUk9MSUdEQj89Ozk3NTQyMTAvLy4uLi4uLy8wMDEyMzQ1Njc5Ozw+P0FDRUdKTU9SU1ZZXGBjZmlsb3J1eHt+gYSHio2QkpWYmZudoKGjpaaorK2ur7Cxs7S0tbW1tbW0tLOysbCvramop6WjopybmZeVk5CKh4N/fHh0cG1qZmNfXFlWU1BNSkdFQkA+PDo4NjU0MjEvLi4uLi4vLzAxMjIzNDU3ODk7PT5AQkRGSUtOUFNVWFthZGdqbXBzdnl7foGDhoiLjZCSlZeZm52foKKjpaaorK2ur7CxsbKysrKysbGxsLCvrq2sq6mopqSinp2alpeUkZCMh4N/fHh0cW5qZ2RgXVpXVFFOTEhFQ0A+PDo4NjQ0MjExMDAwMDEyMjQ1Njc4Ozw+P0BBQ0VHTEtNUFFTVVdZXF5gYmRmaGtvb3FzdXZ3eXp7fH19fn9+fn59fX18e3l4dnRzbmxqZ2VjYF1bWVZTUE5MSUdFQkE/PTw7Ojk4ODg4ODg5OTo7PD0+P0FBQkNERUZHR0dHR0ZFREJAPz07OTc1MzEvLS0tLS0uLi8vMDEyMzQ1Njc4OTk6Ozs7Ozs6Ojk5ODc3NjU0MzIxMC8vLy8w';

// Confetti whoosh - subtle whoosh sound
const confettiWhooshDataUri = 'data:audio/wav;base64,UklGRhYEAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YfIDAACAg4aJjI+Sk5WXmZqbnJ2dnZ2cm5qYlpSTkI2KhoJ+enZybmpmYl5aVVFNSUVBPTk2MzAvLS0tLS0tLi8wMTM0Njg6PD9BREZJTFFTVlldYGNmam1wc3Z5fH+Ch4qNkJOWmZyfo6aorK+ytLa4u729wMLEx8nLzdDT1djb3d/h4+Xm5+jp6uvr6+vq6ejn5eTi4N7c2tfV0tDOzMnHxcO/vbq4tLKurKmmpKKfnJmXlJGPjIqHhYN/fXt5d3V0cW9ua2poZmRiYF5dW1lYVlVUU1JRUVFRUVJTVFVXWVtdX2JkZ2lsbW9ycnV3eXt9f4GCg4SFhoeIiYmKioqKioqJiYmIh4aFg4GAfnx6eHZ0cm9saGVhXltYVFFOTEpHRUI/PTw6OTg3NjY1NTQ0NDQ1NTY2Nzg5Ojs9P0FFR0lLTlBTVVhbXmFlZ2pucnh7foGEh4qNkJKVmJqdn6GjpainqausrrCys7W2uLm6u7y9vr/AwcHCwsPDw8PExMTDw8PCwr++vbq5t7azsa6rqKWin5uYlZGOioeEgX16d3RxbmtpZmRiYF5cWldWVFNSUVBQT09OTk5PT1BRUlNUVVdYWlxeYGJkZ2lrbW9xc3V4eXx+gIKEhoeIiYqKi4yMjIyMjYyMjIuLioqJiIeDgX9+e3l3dXNxb21qZ2VjYF1bWVdVU1BOS0lHRkRDQUA+PT08Ozs6Ojk5OTk5OTo6Ozs9PT9AQkRGSEpNUFJVV1pdYGNmam1wdHd6foCDh4qNkZSXmp2go6aoq66xtrq9v8LFyMvO0dTV19nb3d7f4OHi4uLj4+Pk5OPi4uLg39zb2NbT0M7LyMW/vLi0sK2ppaGdmZWRjYmGgoB9enl2dHJwbmxqaGZkYmBfXVtaWFdWVVRTUlJRUVFRUlJTVFVWWFlaXF5gYmRnaWxucXN2eXx/goWIi42Qk5WYmp2foKKjpKWmpqeoqKmpqqqrq6urq6urqqqqqqmop6akoqCemJeSjo2KhYN/fHl3dHFubGhmZGJfXVtZVlVTUVBOTUtKSEhGRkVFRUVFRUZGR0dIS0xOT1JUVllaXF9hZGZpbG9yZHZ5fH+Ch4qNkJOWmZyfo6aoq66xs7a5vL7BxMfKzc/S1NfZ3N7g4uTl5+jp6evs7O3t7e3t7OzsurZ0b2xpZmNgXlxaWVdWVVRUU1NTVFRVVldYWVtdX2Fja3B0d3t+gYSHio2Qk5aZnJ+ip6qtr7K1t7m8vr/BwsPEx8jJysvMzczLy8rKyMfFxMK/vbq3s7Gsq6mmpKKfoJ2alZORkI2JhYF9enZzb2xtaGZjYF5bWlhWVFNSUFFPTk5NTU1OTU1PUFFSVFVXWl1fYmVobHBzdnp9gIWIi46Rkpe';

soundService.preload('success', successChimeDataUri);
soundService.preload('confetti', confettiWhooshDataUri);
