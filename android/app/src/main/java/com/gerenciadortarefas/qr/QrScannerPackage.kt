package com.gerenciadortarefas.qr

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class QrScannerPackage : BaseReactPackage() {
  override fun getModule(name: String, context: ReactApplicationContext): NativeModule? =
    if (name == QrScannerModule.NAME) QrScannerModule(context) else null
  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(QrScannerModule.NAME to ReactModuleInfo(
      QrScannerModule.NAME, QrScannerModule.NAME, false, false, false, true))
  }
}
