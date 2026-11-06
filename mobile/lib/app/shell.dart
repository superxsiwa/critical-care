import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../data/progress_store.dart';
import '../data/studio_follow.dart';
import '../features/about/about_screen.dart';
import '../l10n/generated/app_localizations.dart';
import 'sfx.dart';
import 'theme.dart';

/// His tab bar under the roster, the ward, the progress page and the settings. Android BACK on another tab goes to
/// the roster first; BACK on the roster leaves the app.
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _noticeOnce();
      _studioAtStart();
    });
  }

  /// Step 10: when the ward follows the Case Studio, take its newest published cases as the app
  /// opens. Offline or with the studio down, nothing is said: the game plays the cases it has.
  Future<void> _studioAtStart() async {
    final result = await ref.read(studioProvider.notifier).checkAtStart();
    if (result != StudioCheck.updated || !mounted) return;
    final info = ref.read(studioProvider).value?.published;
    final l = AppLocalizations.of(context);
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(content: Text(l.studioUpdated(info?.revision ?? 0, info?.cases ?? 0))),
      );
  }

  /// The "for training only" notice, once per device.
  Future<void> _noticeOnce() async {
    final store = ref.read(progressStoreProvider);
    if (await store.noticeSeen() || !mounted) return;
    final l = AppLocalizations.of(context);
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        content: const TrainingNotice(),
        actions: [FilledButton(onPressed: () => Navigator.pop(context), child: Text(l.noticeOk))],
      ),
    );
    await store.markNoticeSeen();
  }

  void _go(int index) {
    if (index != widget.shell.currentIndex) ref.read(sfxProvider).play(Sound.pick);
    widget.shell.goBranch(index, initialLocation: index == widget.shell.currentIndex);
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return PopScope(
      canPop: widget.shell.currentIndex == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _go(0);
      },
      child: Scaffold(
        body: widget.shell,
        bottomNavigationBar: NavigationBar(
          backgroundColor: Colors.white,
          indicatorColor: AppColors.sky100,
          selectedIndex: widget.shell.currentIndex,
          onDestinationSelected: _go,
          destinations: [
            NavigationDestination(
              icon: const Icon(Icons.calendar_month_outlined),
              selectedIcon: const Icon(Icons.calendar_month_rounded, color: AppColors.sky600),
              label: l.tabRoster,
            ),
            NavigationDestination(
              icon: const Icon(Icons.bed_outlined),
              selectedIcon: const Icon(Icons.bed_rounded, color: AppColors.sky600),
              label: l.tabWard,
            ),
            NavigationDestination(
              icon: const Icon(Icons.emoji_events_outlined),
              selectedIcon: const Icon(Icons.emoji_events_rounded, color: AppColors.sky600),
              label: l.tabProgress,
            ),
            NavigationDestination(
              icon: const Icon(Icons.tune_outlined),
              selectedIcon: const Icon(Icons.tune_rounded, color: AppColors.sky600),
              label: l.settingsTitle,
            ),
          ],
        ),
      ),
    );
  }
}
