import type { Schema, Struct } from '@strapi/strapi';

export interface InstituicaoAcreditacao extends Struct.ComponentSchema {
  collectionName: 'components_instituicao_acreditacoes';
  info: {
    displayName: 'Acredita\u00E7\u00E3o ou certifica\u00E7\u00E3o';
  };
  attributes: {
    categoria: Schema.Attribute.Enumeration<['acreditacao', 'certificacao']> &
      Schema.Attribute.Required;
    entidade: Schema.Attribute.String & Schema.Attribute.Required;
    fonte: Schema.Attribute.String;
    nome: Schema.Attribute.String & Schema.Attribute.Required;
    validaAte: Schema.Attribute.Date;
  };
}

export interface InstituicaoContacto extends Struct.ComponentSchema {
  collectionName: 'components_instituicao_contactos';
  info: {
    displayName: 'Contacto institucional';
  };
  attributes: {
    departamento: Schema.Attribute.String;
    publico: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    tipo: Schema.Attribute.Enumeration<['email', 'telefone', 'whatsapp']> &
      Schema.Attribute.Required;
    valor: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface InstituicaoDocumentoLegal extends Struct.ComponentSchema {
  collectionName: 'components_instituicao_documentos_legais';
  info: {
    displayName: 'Documento legal privado';
  };
  attributes: {
    estadoAnalise: Schema.Attribute.Enumeration<
      ['pending', 'approved', 'rejected']
    > &
      Schema.Attribute.DefaultTo<'pending'>;
    mimeType: Schema.Attribute.String & Schema.Attribute.Required;
    motivoRejeicao: Schema.Attribute.Text & Schema.Attribute.Private;
    nome: Schema.Attribute.String & Schema.Attribute.Required;
    storageKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    tamanho: Schema.Attribute.BigInteger & Schema.Attribute.Required;
    tipo: Schema.Attribute.Enumeration<
      ['nif', 'alvara', 'estatuto', 'acreditacao', 'representacao', 'outro']
    > &
      Schema.Attribute.Required;
  };
}

export interface InstituicaoEndereco extends Struct.ComponentSchema {
  collectionName: 'components_instituicao_enderecos';
  info: {
    displayName: 'Endere\u00E7o Angola';
  };
  attributes: {
    comuna: Schema.Attribute.String;
    latitude: Schema.Attribute.Decimal;
    localidade: Schema.Attribute.String;
    longitude: Schema.Attribute.Decimal;
    municipio: Schema.Attribute.String & Schema.Attribute.Required;
    pais: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'AO'>;
    provincia: Schema.Attribute.Enumeration<
      [
        'Bengo',
        'Benguela',
        'Bi\u00E9',
        'Cabinda',
        'Cuando',
        'Cubango',
        'Cuanza Norte',
        'Cuanza Sul',
        'Cunene',
        'Huambo',
        'Hu\u00EDla',
        'Icolo e Bengo',
        'Luanda',
        'Lunda Norte',
        'Lunda Sul',
        'Malanje',
        'Moxico',
        'Moxico Leste',
        'Namibe',
        'U\u00EDge',
        'Zaire',
      ]
    > &
      Schema.Attribute.Required;
    requerConfirmacaoTerritorial: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    rua: Schema.Attribute.String;
  };
}

export interface InstituicaoPolitica extends Struct.ComponentSchema {
  collectionName: 'components_instituicao_politicas';
  info: {
    displayName: 'Pol\u00EDtica p\u00FAblica';
  };
  attributes: {
    titulo: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'instituicao.acreditacao': InstituicaoAcreditacao;
      'instituicao.contacto': InstituicaoContacto;
      'instituicao.documento-legal': InstituicaoDocumentoLegal;
      'instituicao.endereco': InstituicaoEndereco;
      'instituicao.politica': InstituicaoPolitica;
    }
  }
}
