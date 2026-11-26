import os

# Patch for Django on Windows (nt) where TemporaryFile can raise an ignored AttributeError in __del__
if os.name == 'nt':
    try:
        import django.core.files.temp as temp_mod
        if hasattr(temp_mod, 'TemporaryFile'):
            cls = temp_mod.TemporaryFile
            cls.close_called = False
            cls.file = None
            cls.name = None

            def safe_close(self):
                if not getattr(self, 'close_called', False):
                    self.close_called = True
                    try:
                        f = getattr(self, 'file', None)
                        if f and not getattr(f, 'closed', True):
                            f.close()
                    except (OSError, AttributeError):
                        pass
                    try:
                        n = getattr(self, 'name', None)
                        if n:
                            self.unlink(n)
                    except (OSError, AttributeError):
                        pass

            cls.close = safe_close
    except Exception:
        pass
