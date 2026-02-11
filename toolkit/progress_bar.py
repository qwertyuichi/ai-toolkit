from tqdm import tqdm
import time


class ToolkitProgressBar(tqdm):
    def _time(self):
        return time.monotonic()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.paused = False
        self.last_time = self._time()

    def pause(self):
        if not self.paused:
            self.paused = True
            self.last_time = self._time()

    def unpause(self):
        if self.paused:
            self.paused = False

            if getattr(self, "disable", False):
                return

            cur_t = self._time()
            pause_duration = cur_t - self.last_time
            if hasattr(self, "start_t"):
                self.start_t += pause_duration
            if hasattr(self, "last_print_t"):
                self.last_print_t = cur_t

    def update(self, *args, **kwargs):
        if not self.paused:
            super().update(*args, **kwargs)
