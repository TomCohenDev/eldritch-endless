# Flutter clean reinstall (Homebrew)

Follow these steps in **Terminal**. You’ll get a single Homebrew-managed Flutter install and avoid permission issues.

## Step 1: Uninstall existing Flutter

Run:

```bash
# Uninstall Homebrew Flutter cask (removes /usr/local/Caskroom/flutter and the flutter symlink)
brew uninstall --cask flutter

# Remove the other Flutter copy if it exists (often at /usr/local/share/flutter)
sudo rm -rf /usr/local/share/flutter

# Optional but recommended: remove pub cache so no root-owned packages remain
rm -rf ~/.pub-cache
```

If `brew uninstall --cask flutter` says “flutter is not installed”, that’s fine; continue with the other commands.

## Step 2: Install Flutter with Homebrew

```bash
brew install --cask flutter
```

Homebrew will install Flutter and link `flutter` into your PATH (via `/usr/local/bin`).

## Step 3: Confirm and run doctor

```bash
# Restart terminal or run:
hash -r

flutter --version
flutter doctor -v
```

Fix any issues reported by `flutter doctor` (e.g. Xcode license, Android licenses).

## Step 4: Use your project again

```bash
cd /Users/tomcohen/github/eldritch-endless/eldritch_flutter
flutter pub get
flutter run --debug
```

**Important:** Don’t run `flutter` or `dart` with `sudo`. Use it as your normal user so the pub cache and project files stay owned by you.
