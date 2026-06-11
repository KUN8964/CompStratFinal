default_config = {
    "general": {
        "init_cash": 10000.0,
        "fee": 0.0005,
        "since": "2020-01-01T00:00:00Z"
    },
    "btc_turtle": {
        "init_cash": 4000.0,
        "leverage": 3.0,
        # 缩短突破窗口，增加入场频率
        "entry_window": 20,
        "exit_window_bull": 10,
        "exit_window_bear": 7,
        # 加仓间距缩小
        "add_on_n_atr": 0.5,
        "max_units": 4,
        # 降低ADX门槛，减少过滤
        "adx_threshold": 12,
        "risk_min": 0.01,
        "risk_max": 0.05
    },
    "alt_obv_short": {
        "init_cash": 1500.0,
        "leverage": 1.5,
        "position_size_pct": 0.60,
        "stop_loss_pct": 0.12,
        # 移动止盈门槛降低，更容易触发出场
        "trailing_stop_pct": 0.10,
        # 缩短摆动窗口，识别更多局部顶
        "swing_window": 5,
        "max_lookback_days": 90,
        # 降低最小涨幅要求，识别更多顶背离
        "min_rise_pct": 0.02,
        # 大幅降低确认跌幅，从20%降到8%，更快触发入场
        "confirmation_drop_pct": 0.08
    },
    # 扩展山寨币做空标的
    "alt_symbols": ["ETH/USDT", "SOL/USDT", "BNB/USDT", "DOGE/USDT", "LINK/USDT"],
    # 每个山寨币分配资金
    "alt_cash_per_symbol": 1200.0
}
